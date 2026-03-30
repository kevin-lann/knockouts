import type * as Party from "partykit/server"
import {
  type Player,
  type RoomSettings,
  type ClientMessage,
  type ServerMessage,
  type Question,
  type Answer,
} from "@shared/types"
import {
  GameState,
  ServerMessageType,
  BotDifficulty,
  ClientMessageType,
  DEFAULT_BOT_COUNT,
  MIN_BOT_COUNT,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_PLAYER_LIVES,
} from "@shared/types"
import { configureDatabase, fetchQuestion } from "./db"
import {
  DEFAULT_ROUND_DURATION,
  MAX_PLAYERS as MAX_PLAYERS_CONSTANT,
  SCOREBOARD_NEXT_ROUND_COUNTDOWN_SECONDS,
} from "./constants/magic-numbers"
import { isPublicRoomId } from "./utils/roomId"
import { getAvatarImagePathById } from "./utils/avatar"
import { verifyJoinToken } from "./utils/joinToken"
import { getHighestScoringPlayers } from "./utils/playerRanking"
import type { LockedIdentity, PrefetchedRound } from "./server/server-types"
import {
  getHumanPlayerCount as getHumanPlayerCountUtil,
  isGameEnded as isGameEndedUtil,
  normalizeBotCount as normalizeBotCountUtil,
  normalizeMaxRounds as normalizeMaxRoundsUtil,
} from "./server/player-utils"
import {
  removeAllBotsIfNoHumans as removeAllBotsIfNoHumansUtil,
  syncBotsToSettings as syncBotsToSettingsUtil,
  assignBotAnswers as assignBotAnswersUtil,
} from "./server/bot-manager"
import {
  resetAllSubmissions,
  resetRoundSubmissions,
  processRoundSubmissions,
} from "./server/round-engine"
import {
  broadcastPlayerUpdateMessage,
  broadcastSyncMessage,
  sendSyncMessage,
} from "./server/room-sync"
import {
  notifyRegistry as notifyRegistryExternal,
  startRegistryHeartbeat as startRegistryHeartbeatExternal,
  stopRegistryHeartbeat as stopRegistryHeartbeatExternal,
} from "./server/registry"

export default class GameServer implements Party.Server {
  // Core state
  gameState: GameState = GameState.LOBBY
  players: Map<string, Player> = new Map()
  connectionClientIds: Map<string, string> = new Map()
  clientIdentities: Map<string, LockedIdentity> = new Map()
  hostClientId: string | null = null
  isPublic: boolean = false // Track if room is public or private
  settings: RoomSettings = {
    botEnabled: true,
    botCount: DEFAULT_BOT_COUNT,
    botDifficulty: BotDifficulty.EASY,
    themes: null,
    speedMultiplier: 1.0,
    maxRounds: DEFAULT_MAX_ROUNDS,
  }

  // Round state
  currentQuestion: Question | null = null
  currentAnswers: Answer[] = []
  timer: number = 0
  round: number = 0
  countdownTimer: number = 3
  timerInterval: ReturnType<typeof setInterval> | null = null
  registryHeartbeatInterval: ReturnType<typeof setInterval> | null = null
  prefetchedRound: PrefetchedRound | null = null

  private static readonly MAX_PLAYERS = MAX_PLAYERS_CONSTANT

  constructor(readonly room: Party.Room) {
    const roomDatabaseUrl =
      typeof room.env.DATABASE_URL === "string"
        ? room.env.DATABASE_URL
        : undefined
    const roomSupabaseUrl =
      typeof room.env.SUPABASE_URL === "string"
        ? room.env.SUPABASE_URL
        : undefined
    const roomSupabaseServiceRoleKey =
      typeof room.env.SUPABASE_SERVICE_ROLE_KEY === "string"
        ? room.env.SUPABASE_SERVICE_ROLE_KEY
        : undefined
    configureDatabase(
      roomDatabaseUrl,
      undefined,
      roomSupabaseUrl,
      roomSupabaseServiceRoleKey
    )
  }

  private startRegistryHeartbeat() {
    this.registryHeartbeatInterval = startRegistryHeartbeatExternal(
      () => {
        void this.notifyRegistry()
      },
      this.registryHeartbeatInterval
    )
  }

  /**
   * Notify registry server about room state
   */
  private async notifyRegistry() {
    await notifyRegistryExternal({
      room: this.room,
      isPublic: this.isPublic,
      gameState: this.gameState,
      playerCount: this.getHumanPlayerCount(),
      maxPlayers: GameServer.MAX_PLAYERS,
    })
  }

  async onRequest(request: Party.Request) {
    if (request.method === "GET") {
      // Check if room is available for public joining
      const isAvailable =
        this.gameState === GameState.LOBBY &&
        this.getHumanPlayerCount() < GameServer.MAX_PLAYERS
      return new Response(
        JSON.stringify({
          available: isAvailable,
          playerCount: this.getHumanPlayerCount(),
          maxPlayers: GameServer.MAX_PLAYERS,
          gameState: this.gameState,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    }
    return new Response("Method not allowed", { status: 405 })
  }

  onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
    console.log(
      `Player connected: ${conn.id} to room ${this.room.id}, current human players: ${this.getHumanPlayerCount()}`
    )
    // Don't send SYNC here - wait for JOIN_ROOM message to be processed
    // The JOIN_ROOM handler will send SYNC after adding the player to ensure they see themselves
  }

  onClose(conn: Party.Connection) {
    console.log(`Player disconnected: ${conn.id}`)
    this.connectionClientIds.delete(conn.id)
    const player = this.players.get(conn.id)
    if (player) {
      this.players.delete(conn.id)
      this.removeAllBotsIfNoHumans()
      this.ensureConnectedHost()

      // If in lobby and no players left, reset
      if (this.getHumanPlayerCount() === 0 && this.gameState === GameState.LOBBY) {
        this.gameState = GameState.LOBBY
        this.round = 0
        this.hostClientId = null
        this.stopRegistryHeartbeat()
      }

      this.broadcastPlayerUpdate()
      this.notifyRegistry() // Player count changed
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const msg: ClientMessage = JSON.parse(message)
      void this.handleMessage(msg, sender).catch((error) => {
        console.error("Error handling message:", error)
        sender.send(
          JSON.stringify({
            type: ServerMessageType.ERROR,
            message: "Failed to process message",
          } as ServerMessage)
        )
      })
    } catch (error) {
      console.error("Error parsing message:", error)
      sender.send(
        JSON.stringify({
          type: "ERROR",
          message: "Invalid message format",
        } as ServerMessage)
      )
    }
  }

  private async handleMessage(msg: ClientMessage, sender: Party.Connection) {
    switch (msg.type) {
      case ClientMessageType.JOIN_ROOM:
        await this.handleJoinRoom(msg, sender)
        break
      case ClientMessageType.START_GAME:
        this.handleStartGame(msg, sender)
        break
      case ClientMessageType.SUBMIT:
        this.handleSubmit(msg, sender)
        break
      case ClientMessageType.NEXT_ROUND:
        this.handleNextRound(msg, sender)
        break
      case ClientMessageType.LEAVE_ROOM:
        this.handleLeaveRoom(sender)
        break
      case ClientMessageType.START_NEW_LOBBY:
        this.handleStartNewLobby(sender)
        break
    }
  }

  private handleLeaveRoom(sender: Party.Connection) {
    const leavingPlayer = this.players.get(sender.id)
    this.connectionClientIds.delete(sender.id)
    this.players.delete(sender.id)
    this.removeAllBotsIfNoHumans()
    this.ensureConnectedHost(leavingPlayer?.isHost ?? false)

    if (this.getHumanPlayerCount() === 0) {
      this.stopRegistryHeartbeat()
    }

    this.broadcastPlayerUpdate()
    this.notifyRegistry()
  }

  private handleStartNewLobby(sender: Party.Connection) {
    const player = this.players.get(sender.id)
    if (!player?.isHost) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Only host can start a new lobby",
        } as ServerMessage)
      )
      return
    }

    this.clearTimerInterval()

    for (const existingPlayer of this.players.values()) {
      existingPlayer.score = 0
      existingPlayer.streak = 0
      existingPlayer.isEliminated = false
      existingPlayer.hasHighestScore = false
      existingPlayer.hasSubmitted = false
      existingPlayer.currentAnswer = undefined
    }

    this.currentQuestion = null
    this.currentAnswers = []
    this.timer = 0
    this.countdownTimer = 3
    this.gameState = GameState.LOBBY
    this.round = 0
    this.clearPrefetchedRound()
    this.broadcastSync()
    this.broadcastPlayerUpdate()
    this.notifyRegistry()
  }

  private async handleJoinRoom(
    msg: Extract<ClientMessage, { type: ClientMessageType.JOIN_ROOM }>,
    sender: Party.Connection
  ) {
    if (this.getHumanPlayerCount() >= GameServer.MAX_PLAYERS) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Room is full",
        } as ServerMessage)
      )
      return
    }

    // Set room type on first player join from room ID, not client input
    const isFirstPlayer = this.getHumanPlayerCount() === 0
    if (isFirstPlayer) {
      this.isPublic = isPublicRoomId(this.room.id)
      if (this.isPublic) {
        this.startRegistryHeartbeat()
      }
    }

    const existingClientIdForConnection = this.connectionClientIds.get(
      sender.id
    )
    if (
      existingClientIdForConnection &&
      existingClientIdForConnection !== msg.clientId
    ) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Connection identity is locked",
        } as ServerMessage)
      )
      return
    }

    const roomJoinTokenSecret =
      typeof this.room.env.JOIN_TOKEN_SECRET === "string"
        ? this.room.env.JOIN_TOKEN_SECRET
        : undefined
    const joinClaims = await verifyJoinToken(msg.joinToken, roomJoinTokenSecret)
    if (
      !joinClaims ||
      joinClaims.roomId !== this.room.id ||
      joinClaims.clientId !== msg.clientId
    ) {
      if (!joinClaims) {
        console.error("Join token verification failed", {
          roomId: this.room.id,
          hasRoomJoinTokenSecret: Boolean(roomJoinTokenSecret),
        })
      } else {
        console.error("Join token payload mismatch", {
          expectedRoomId: this.room.id,
          tokenRoomId: joinClaims.roomId,
          expectedClientId: msg.clientId,
          tokenClientId: joinClaims.clientId,
        })
      }
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Invalid join token",
        } as ServerMessage)
      )
      return
    }

    const existingPlayer = this.players.get(sender.id)
    if (existingPlayer) {
      this.sendSync(sender)
      return
    }

    this.connectionClientIds.set(sender.id, msg.clientId)
    const identity = {
      name: joinClaims.name,
      avatarId: joinClaims.avatarId,
    }
    this.clientIdentities.set(msg.clientId, identity)

    const existingHostConnectionId = Array.from(this.players.entries()).find(
      ([, p]) => p.isHost
    )?.[0]
    const shouldBeHost =
      this.hostClientId === msg.clientId ||
      (!existingHostConnectionId &&
        (this.hostClientId === null || this.getHumanPlayerCount() === 0))

    if (shouldBeHost) {
      this.hostClientId = msg.clientId
      for (const existingPlayer of this.players.values()) {
        existingPlayer.isHost = false
      }
    }

    const player: Player = {
      id: sender.id,
      name: identity.name,
      avatarId: identity.avatarId,
      avatarImagePath: getAvatarImagePathById(identity.avatarId),
      lives: DEFAULT_PLAYER_LIVES,
      score: 0,
      streak: 0,
      isHost: shouldBeHost,
      isBot: false,
      isEliminated: false,
      hasHighestScore: false,
      hasSubmitted: false,
    }

    this.players.set(sender.id, player)
    console.log(
      `Player ${sender.id} (${identity.name}) joined. Total human players: ${this.getHumanPlayerCount()}`
    )
    console.log(
      `Room has ${
        Array.from(this.room.getConnections()).length
      } active connections`
    )

    // Send SYNC to the new player first (includes them in the player list)
    // This ensures they see themselves immediately
    this.sendSync(sender)

    // Then broadcast PLAYER_UPDATE to ALL connections (including the new one)
    // This ensures everyone sees the updated player list
    this.broadcastPlayerUpdate()

    this.notifyRegistry()
  }

  private handleStartGame(
    msg: Extract<ClientMessage, { type: ClientMessageType.START_GAME }>,
    sender: Party.Connection
  ) {
    const player = this.players.get(sender.id)
    if (!player?.isHost) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Only host can start the game",
        } as ServerMessage)
      )
      return
    }

    const humanPlayerCount = this.getHumanPlayerCount()
    const normalizedBotCount = this.normalizeBotCount(msg.settings.botCount)
    const botCount = msg.settings.botEnabled ? normalizedBotCount : MIN_BOT_COUNT

    if (humanPlayerCount + botCount < 2) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Need at least 2 players to start",
        } as ServerMessage)
      )
      return
    }

    this.settings = {
      ...msg.settings,
      botCount: normalizedBotCount,
      maxRounds: this.normalizeMaxRounds(msg.settings.maxRounds),
    }
    this.syncBotsToSettings()
    this.round = 0
    this.clearPrefetchedRound()
    this.startGame()
    this.notifyRegistry() // Game starting - room no longer available
  }

  private handleSubmit(
    msg: Extract<ClientMessage, { type: ClientMessageType.SUBMIT }>,
    sender: Party.Connection
  ) {
    if (this.gameState !== GameState.PLAYING) {
      return
    }

    const player = this.players.get(sender.id)
    if (!player || player.isBot || player.isEliminated) {
      return
    }

    // Allow modification - update answer and mark as submitted
    player.currentAnswer = msg.answer
    player.hasSubmitted = true

    this.broadcastPlayerUpdate()

    // Check if all players have submitted
    const alivePlayers = Array.from(this.players.values()).filter(
      (p) => !p.isBot && !p.isEliminated
    )
    if (alivePlayers.every((p) => p.hasSubmitted)) {
      // All submitted, process immediately
      this.processRound()
    }
  }

  private handleNextRound(
    msg: Extract<ClientMessage, { type: ClientMessageType.NEXT_ROUND }>,
    sender: Party.Connection
  ) {
    const player = this.players.get(sender.id)
    if (!player?.isHost) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Only host can start next round",
        } as ServerMessage)
      )
      return
    }

    if (this.gameState !== GameState.SCOREBOARD) {
      return
    }

    this.clearTimerInterval()
    this.startGame()
  }

  private async startGame() {
    this.clearTimerInterval()
    this.gameState = GameState.FETCH_ROUND
    this.round++

    try {
      const alivePlayers = Array.from(this.players.values()).filter(
        (p) => !p.isEliminated
      )
      const alivePlayerCount = alivePlayers.length
      const prefetchedRound = this.prefetchedRound
      let roundData: { question: Question; answers: Answer[] } | null = null

      if (
        prefetchedRound &&
        prefetchedRound.round === this.round &&
        prefetchedRound.alivePlayerCount === alivePlayerCount
      ) {
        roundData = await prefetchedRound.promise
      }

      this.clearPrefetchedRound()

      if (!roundData) {
        roundData = await fetchQuestion(
          alivePlayerCount,
          this.round,
          this.settings.themes || undefined
        )
      }

      this.currentQuestion = roundData.question
      this.currentAnswers = roundData.answers

      resetRoundSubmissions(this.players)

      if (this.round === 1) {
        this.startCountdown()
      } else {
        this.startPlaying()
      }
    } catch (error) {
      console.error("Error fetching question:", error)
      this.room.broadcast(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Failed to fetch question",
        } as ServerMessage)
      )
      this.gameState = GameState.LOBBY
      this.notifyRegistry() // Back to lobby - room available again
    }
  }

  private startCountdown() {
    this.gameState = GameState.COUNTDOWN
    this.countdownTimer = 3

    // Update to countdown gamestate
    this.broadcastSync()

    const countdownInterval = setInterval(() => {
      this.countdownTimer--
      this.room.broadcast(
        JSON.stringify({
          type: ServerMessageType.TICK,
          time: this.countdownTimer,
        } as ServerMessage)
      )

      if (this.countdownTimer < 0) {
        clearInterval(countdownInterval)
        this.startPlaying()
      }
    }, 1000)
  }

  private startPlaying() {
    this.gameState = GameState.PLAYING
    const roundDuration = DEFAULT_ROUND_DURATION * this.settings.speedMultiplier
    this.timer = Math.ceil(roundDuration)

    this.room.broadcast(
      JSON.stringify({
        type: ServerMessageType.ROUND_START,
        question: this.currentQuestion!,
        answerCount: this.currentQuestion!.answer_count_cache,
        round: this.round,
      } as ServerMessage)
    )

    this.timerInterval = setInterval(() => {
      this.timer--
      this.room.broadcast(
        JSON.stringify({
          type: ServerMessageType.TICK,
          time: this.timer,
        } as ServerMessage)
      )

      if (this.timer <= 0) {
        this.clearTimerInterval()
        this.processRound()
      }
    }, 1000)
  }

  private async processRound() {
    this.clearTimerInterval()

    this.gameState = GameState.PROCESSING

    await this.assignBotAnswers()

    const { results, correctAnswers } = processRoundSubmissions(
      this.players,
      this.currentAnswers
    )

    const roundCapReached = this.round >= this.settings.maxRounds

    // End if all but one player is eliminated or we reached the configured round cap
    if (this.isGameEnded() || roundCapReached) {
      this.handleGameEnded()
      this.notifyRegistry()
      this.room.broadcast(
        JSON.stringify({
          type: ServerMessageType.GAME_ENDED,
          results,
          correctAnswers,
          round: this.round,
        } as ServerMessage)
      )
      return
    }

    this.prefetchNextRound()

    // Update players with the highest score
    const leadingPlayers = getHighestScoringPlayers(this.players)
    for (const player of leadingPlayers) {
      player.hasHighestScore = true
    }

    resetAllSubmissions(this.players)

    this.gameState = GameState.SCOREBOARD

    this.room.broadcast(
      JSON.stringify({
        type: ServerMessageType.ROUND_END,
        results,
        correctAnswers,
        round: this.round,
      } as ServerMessage)
    )

    this.startScoreboardCountdown()
    this.broadcastPlayerUpdate()
  }

  private startScoreboardCountdown() {
    this.clearTimerInterval()
    this.timer = SCOREBOARD_NEXT_ROUND_COUNTDOWN_SECONDS

    this.room.broadcast(
      JSON.stringify({
        type: ServerMessageType.TICK,
        time: this.timer,
      } as ServerMessage)
    )

    this.timerInterval = setInterval(() => {
      this.timer--
      this.room.broadcast(
        JSON.stringify({
          type: ServerMessageType.TICK,
          time: this.timer,
        } as ServerMessage)
      )

      if (this.timer <= 0) {
        this.clearTimerInterval()
        if (this.gameState === GameState.SCOREBOARD) {
          this.startGame()
        }
      }
    }, 1000)
  }

  private clearTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  private stopRegistryHeartbeat() {
    this.registryHeartbeatInterval = stopRegistryHeartbeatExternal(
      this.registryHeartbeatInterval
    )
  }

  private clearPrefetchedRound() {
    this.prefetchedRound = null
  }

  private getHumanPlayerCount() {
    return getHumanPlayerCountUtil(this.players)
  }

  private normalizeBotCount(botCount: number | undefined): number {
    return normalizeBotCountUtil(botCount)
  }

  private removeAllBotsIfNoHumans() {
    removeAllBotsIfNoHumansUtil(this.players)
  }

  private syncBotsToSettings() {
    syncBotsToSettingsUtil(this.players, this.settings)
  }

  private async assignBotAnswers() {
    await assignBotAnswersUtil(
      this.players,
      this.currentQuestion,
      this.settings.botDifficulty
    )
  }

  private prefetchNextRound() {
    const alivePlayerCount = Array.from(this.players.values()).filter(
      (p) => !p.isEliminated
    ).length

    const round = this.round + 1
    const themes = this.settings.themes

    this.prefetchedRound = {
      round,
      alivePlayerCount,
      themes,
      promise: fetchQuestion(alivePlayerCount, round, themes ?? undefined)
        .then(({ question, answers }) => ({ question, answers }))
        .catch((error) => {
          console.error("Error prefetching next round question:", error)
          return null
        }),
    }
  }

  private isGameEnded(): boolean {
    return isGameEndedUtil(this.players)
  }

  private normalizeMaxRounds(maxRounds: number | undefined): number {
    return normalizeMaxRoundsUtil(maxRounds)
  }

  /**
   * Clear all player states and reset the game
   */
  private async handleGameEnded() {
    this.clearPrefetchedRound()
    for (const player of this.players.values()) {
      player.lives = DEFAULT_PLAYER_LIVES
      player.hasHighestScore = false
      player.isEliminated = false
      player.hasSubmitted = false
      player.currentAnswer = undefined
      player.score = 0
      player.streak = 0
    }
    this.round = 0
    this.gameState = GameState.GAME_ENDED
  }

  private sendSync(conn: Party.Connection) {
    sendSyncMessage(conn, {
      gameState: this.gameState,
      players: this.players,
      timer: this.timer,
      question: this.currentQuestion,
      round: this.round,
      settings: this.settings,
    })
  }

  /**
   * If a player reconnects and is the room's original host, they should be promoted back to host.
   */
  private ensureConnectedHost(forceFallback = false) {
    const humanPlayers = Array.from(this.players.entries()).filter(
      ([, player]) => !player.isBot
    )

    if (humanPlayers.length === 0) {
      this.hostClientId = null
      return
    }

    const currentHost = humanPlayers.find(([, player]) => player.isHost)?.[1]
    if (currentHost) {
      const hostClientId = this.connectionClientIds.get(currentHost.id)
      if (hostClientId) {
        this.hostClientId = hostClientId
      }
      return
    }

    const hostReconnectedEntry = Array.from(this.players.entries()).find(
      ([connId]) => this.connectionClientIds.get(connId) === this.hostClientId
    )

    if (hostReconnectedEntry) {
      const [, hostPlayer] = hostReconnectedEntry
      hostPlayer.isHost = true
      return
    }

    if (!forceFallback && this.hostClientId !== null) {
      return
    }

    const [fallbackConnId, fallbackHost] = humanPlayers[0]
    for (const player of this.players.values()) {
      player.isHost = false
    }
    fallbackHost.isHost = true
    this.hostClientId = this.connectionClientIds.get(fallbackConnId) ?? null
  }

  /**
   * Broadcast the current player list to all connections in the room.
   */
  private broadcastPlayerUpdate() {
    broadcastPlayerUpdateMessage(this.room, this.players)
  }

  /**
   * Broadcast the current room state to all connections in the room.
   */
  private broadcastSync() {
    broadcastSyncMessage(this.room, {
      gameState: this.gameState,
      players: this.players,
      timer: this.countdownTimer,
      question: this.currentQuestion,
      round: this.round,
      settings: this.settings,
    })
  }
}

GameServer satisfies Party.Worker
