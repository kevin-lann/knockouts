import type * as Party from "partykit/server"
import type { Player, Question, RoomSettings, ServerMessage } from "@shared/types"
import { GameState, ServerMessageType } from "@shared/types"

interface SyncPayload {
  gameState: GameState
  players: Map<string, Player>
  timer: number
  question: Question | null
  round: number
  settings: RoomSettings
}

export function sendSyncMessage(conn: Party.Connection, payload: SyncPayload) {
  conn.send(
    JSON.stringify({
      type: ServerMessageType.SYNC,
      state: payload.gameState,
      players: Array.from(payload.players.values()),
      timer: payload.timer,
      question: payload.question || undefined,
      round: payload.round,
      settings: payload.settings,
    } as ServerMessage)
  )
}

export function broadcastSyncMessage(room: Party.Room, payload: SyncPayload) {
  room.broadcast(
    JSON.stringify({
      type: ServerMessageType.SYNC,
      state: payload.gameState,
      players: Array.from(payload.players.values()),
      timer: payload.timer,
      question: payload.question || undefined,
      round: payload.round,
      settings: payload.settings,
    } as ServerMessage)
  )
}

export function broadcastPlayerUpdateMessage(
  room: Party.Room,
  players: Map<string, Player>
) {
  const playerList = Array.from(players.values())
  const message = JSON.stringify({
    type: ServerMessageType.PLAYER_UPDATE,
    players: playerList,
  } as ServerMessage)

  console.log(
    `Broadcasting PLAYER_UPDATE to all connections. Players: ${playerList.length}`,
    playerList.map((p) => p.name)
  )
  console.log(`Room connections count: ${Array.from(room.getConnections()).length}`)

  room.broadcast(message)
}
