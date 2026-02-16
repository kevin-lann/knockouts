import type * as Party from "partykit/server"
import {
  type Player,
  type RoomSettings,
  type ClientMessage,
  type ServerMessage,
  type Question,
  type Answer,
  type RoundResult,
} from "./types"
import {
  GameState,
  ServerMessageType,
  BotDifficulty,
  ClientMessageType,
  AvatarId,
} from "./types"
import { fetchQuestion, getBotAnswer } from "./db"
import { validateAnswer, findDuplicates } from "./utils/validation"
import {
  DEFAULT_ROUND_DURATION,
  MAX_PLAYERS as MAX_PLAYERS_CONSTANT,
} from "./constants/magic-numbers"
import { isPublicRoomId } from "./utils/roomId"
import { getAvatarById } from "./utils/avatar"
import { verifyJoinToken } from "./utils/joinToken"

interface LockedIdentity {
  name: string
  avatarId: AvatarId
}

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
    botDifficulty: BotDifficulty.EASY,
    theme: null,
    speedMultiplier: 1.0,
  }

  // Round state
  currentQuestion: Question | null = null
  currentAnswers: Answer[] = []
  timer: number = 0
  round: number = 0
  countdownTimer: number = 3
  timerInterval: ReturnType<typeof setInterval> | null = null

  private static readonly MAX_PLAYERS = MAX_PLAYERS_CONSTANT

  constructor(readonly room: Party.Room) {}

  /**
   * Notify registry server about room state
   */
  private async notifyRegistry() {
    // Only notify registry for public rooms
    if (!this.isPublic) {
      return
    }

    try {
      const registryParty = this.room.context.parties.registry
      const registryRoom = registryParty.get("main")

      await registryRoom.fetch({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: this.room.id,
          playerCount: this.players.size,
          maxPlayers: GameServer.MAX_PLAYERS,
          gameState: this.gameState,
        }),
      })
    } catch (error) {
      // Silently fail - registry might not be available in dev
      console.error("Failed to notify registry:", error)
    }
  }

  async onRequest(request: Party.Request) {
    if (request.method === "GET") {
      // Check if room is available for public joining
      const isAvailable =
        this.gameState === GameState.LOBBY &&
        this.players.size < GameServer.MAX_PLAYERS
      return new Response(
        JSON.stringify({
          available: isAvailable,
          playerCount: this.players.size,
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
      `Player connected: ${conn.id} to room ${this.room.id}, current players: ${this.players.size}`
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
      this.ensureConnectedHost()

      // If in lobby and no players left, reset
      if (this.players.size === 0 && this.gameState === GameState.LOBBY) {
        this.gameState = GameState.LOBBY
        this.round = 0
        this.hostClientId = null
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
    }
  }

  private handleLeaveRoom(sender: Party.Connection) {
    const leavingPlayer = this.players.get(sender.id)
    this.connectionClientIds.delete(sender.id)
    this.players.delete(sender.id)
    this.ensureConnectedHost(leavingPlayer?.isHost ?? false)

    this.broadcastPlayerUpdate()
    this.notifyRegistry()
  }

  private async handleJoinRoom(
    msg: Extract<ClientMessage, { type: ClientMessageType.JOIN_ROOM }>,
    sender: Party.Connection
  ) {
    if (this.gameState !== GameState.LOBBY) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Game already in progress",
        } as ServerMessage)
      )
      return
    }

    if (this.players.size >= GameServer.MAX_PLAYERS) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Room is full",
        } as ServerMessage)
      )
      return
    }

    // Set room type on first player join from room ID, not client input
    const isFirstPlayer = this.players.size === 0
    if (isFirstPlayer) {
      this.isPublic = isPublicRoomId(this.room.id)
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

    const joinClaims = await verifyJoinToken(msg.joinToken)
    if (
      !joinClaims ||
      joinClaims.roomId !== this.room.id ||
      joinClaims.clientId !== msg.clientId
    ) {
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
    const lockedIdentity = this.clientIdentities.get(msg.clientId)
    if (
      lockedIdentity &&
      (lockedIdentity.name !== joinClaims.name ||
        lockedIdentity.avatarId !== joinClaims.avatarId)
    ) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Identity is locked for this room",
        } as ServerMessage)
      )
      return
    }

    const identity = lockedIdentity ?? {
      name: joinClaims.name,
      avatarId: joinClaims.avatarId,
    }
    if (!lockedIdentity) {
      this.clientIdentities.set(msg.clientId, identity)
    }

    const existingHostConnectionId = Array.from(this.players.entries()).find(
      ([, p]) => p.isHost
    )?.[0]
    const shouldBeHost =
      this.hostClientId === msg.clientId ||
      (!existingHostConnectionId &&
        (this.hostClientId === null || this.players.size === 0))

    if (shouldBeHost) {
      this.hostClientId = msg.clientId
      for (const existingPlayer of this.players.values()) {
        existingPlayer.isHost = false
      }
    }

    const player: Player = {
      id: sender.id,
      name: identity.name,
      avatar: getAvatarById(identity.avatarId),
      score: 0,
      isHost: shouldBeHost,
      isBot: false,
      isEliminated: false,
      hasSubmitted: false,
    }

    this.players.set(sender.id, player)
    console.log(
      `Player ${sender.id} (${identity.name}) joined. Total players: ${this.players.size}`
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

    if (this.players.size < 2) {
      sender.send(
        JSON.stringify({
          type: ServerMessageType.ERROR,
          message: "Need at least 2 players to start",
        } as ServerMessage)
      )
      return
    }

    this.settings = msg.settings
    this.round = 0
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

    this.startGame()
  }

  private async startGame() {
    this.gameState = GameState.FETCH_ROUND
    this.round++

    try {
      const alivePlayers = Array.from(this.players.values()).filter(
        (p) => !p.isBot && !p.isEliminated
      )
      const { question, answers } = await fetchQuestion(
        alivePlayers.length,
        this.round,
        this.settings.theme || undefined
      )

      this.currentQuestion = question
      this.currentAnswers = answers

      // Reset player submission states
      for (const player of this.players.values()) {
        if (!player.isBot && !player.isEliminated) {
          player.hasSubmitted = false
          player.currentAnswer = undefined
        }
      }

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
        if (this.timerInterval) {
          clearInterval(this.timerInterval)
          this.timerInterval = null
        }
        this.processRound()
      }
    }, 1000)
  }

  private async processRound() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }

    this.gameState = GameState.PROCESSING

    // Inject bot answer if enabled
    if (this.settings.botEnabled && this.currentQuestion) {
      try {
        const botAnswer = await getBotAnswer(
          this.currentQuestion.id,
          this.settings.botDifficulty
        )

        const botPlayer: Player = {
          id: "bot",
          name: "Bot",
          avatar: "🤖",
          score: 0,
          isHost: false,
          isBot: true,
          isEliminated: false,
          currentAnswer: botAnswer.display_text,
          hasSubmitted: true,
        }

        // Add bot to players temporarily for scoring
        this.players.set("bot", botPlayer)
      } catch (error) {
        console.error("Error getting bot answer:", error)
      }
    }

    // Collect all submissions
    const submissions = new Map<string, string>()
    for (const [playerId, player] of this.players.entries()) {
      if (player.currentAnswer) {
        submissions.set(playerId, player.currentAnswer)
      }
    }

    // Validate answers
    const validatedAnswers = new Map<string, Answer | null>()
    for (const [playerId, answer] of submissions.entries()) {
      validatedAnswers.set(
        playerId,
        validateAnswer(answer, this.currentAnswers)
      )
    }

    // Find duplicates
    const duplicates = findDuplicates(submissions, this.currentAnswers)

    // Calculate scores and build results
    const results: RoundResult[] = []
    const correctAnswers = this.currentAnswers.map((a) => a.display_text)

    for (const [playerId, player] of this.players.entries()) {
      const validated = validatedAnswers.get(playerId)
      const isDuplicate = duplicates.has(playerId)
      const isValid = validated !== null && validated !== undefined
      const points = isValid && !isDuplicate ? 1 : 0

      player.score += points

      if (!player.isBot && isDuplicate) {
        player.isEliminated = true
      }

      results.push({
        playerId,
        playerName: player.name,
        answer: player.currentAnswer || "",
        isValid,
        isDuplicate,
        points,
      })
    }

    // Remove bot from players after scoring
    if (this.settings.botEnabled) {
      this.players.delete("bot")
    }

    // If all players are eliminated, end the game
    if (this.isGameEnded()) {
      this.handleGameEnded()
      this.notifyRegistry()
      this.room.broadcast(
        JSON.stringify({
          type: ServerMessageType.GAME_ENDED,
          results,
          correctAnswers,
        } as ServerMessage)
      )
      return
    }

    // Reset submission states
    for (const player of this.players.values()) {
      player.hasSubmitted = false
      player.currentAnswer = undefined
    }

    this.gameState = GameState.SCOREBOARD

    this.room.broadcast(
      JSON.stringify({
        type: ServerMessageType.ROUND_END,
        results,
        correctAnswers,
      } as ServerMessage)
    )

    this.broadcastPlayerUpdate()
  }

  private isGameEnded(): boolean {
    const alivePlayers = Array.from(this.players.values()).filter(
      (p) => !p.isBot && !p.isEliminated
    )
    return alivePlayers.length === 0
  }

  /** 
   * Clear all player states and reset the game
   */
  private async handleGameEnded() {
    for (const player of this.players.values()) {
      player.isEliminated = false
      player.hasSubmitted = false
      player.currentAnswer = undefined
      player.score = 0
    }
    this.round = 0
    this.gameState = GameState.GAME_ENDED
  }

  private sendSync(conn: Party.Connection) {
    conn.send(
      JSON.stringify({
        type: ServerMessageType.SYNC,
        state: this.gameState,
        players: Array.from(this.players.values()),
        timer: this.timer,
        question: this.currentQuestion || undefined,
        round: this.round,
      } as ServerMessage)
    )
  }

  /**
   * If a player reconnects and is the room's original host, they should be promoted back to host.
   */
  private ensureConnectedHost(forceFallback = false) {
    if (this.players.size === 0) {
      this.hostClientId = null
      return
    }

    const currentHost = Array.from(this.players.values()).find((p) => p.isHost)
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

    const [fallbackConnId, fallbackHost] = Array.from(this.players.entries())[0]
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
    const playerList = Array.from(this.players.values())
    const message = JSON.stringify({
      type: ServerMessageType.PLAYER_UPDATE,
      players: playerList,
    } as ServerMessage)

    console.log(
      `Broadcasting PLAYER_UPDATE to all connections. Players: ${playerList.length}`,
      playerList.map((p) => p.name)
    )
    console.log(
      `Room connections count: ${Array.from(this.room.getConnections()).length}`
    )

    // Broadcast to all connections in the room (includes all connected clients)
    this.room.broadcast(message)
  }

  /**
   * Broadcast the current room state to all connections in the room.
   */
  private broadcastSync() {
    this.room.broadcast(
      JSON.stringify({
        type: ServerMessageType.SYNC,
        state: this.gameState,
        players: Array.from(this.players.values()),
        timer: this.countdownTimer,
        question: this.currentQuestion || undefined,
        round: this.round,
      } as ServerMessage)
    )
  }
}

GameServer satisfies Party.Worker
