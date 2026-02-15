import type * as Party from "partykit/server"
import { GameState } from "./types"

interface RoomInfo {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  gameState: string;
  lastUpdated: number;
}

export default class RegistryServer implements Party.Server {
  // Map of roomId -> RoomInfo
  private rooms: Map<string, RoomInfo> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(readonly room: Party.Room) {
    // Clean up stale rooms every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleRooms()
    }, 30000)
  }

  async onRequest(request: Party.Request) {
    if (request.method === "GET") {
      // Return list of available rooms
      const availableRooms = Array.from(this.rooms.values())
        .filter(
          (room) =>
            room.gameState === GameState.LOBBY && room.playerCount < room.maxPlayers
        )
        .sort((a, b) => b.lastUpdated - a.lastUpdated) // Most recently updated first

      return new Response(
        JSON.stringify({
          rooms: availableRooms.map((r) => ({
            roomId: r.roomId,
            playerCount: r.playerCount,
            maxPlayers: r.maxPlayers,
          })),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (request.method === "POST") {
      // Update room status
      const body = await request.json()
      const { roomId, playerCount, maxPlayers, gameState } = body as {
        roomId: string;
        playerCount: number;
        maxPlayers: number;
        gameState: GameState;
      }

      const isAvailable =
        gameState === GameState.LOBBY && playerCount < maxPlayers

      if (isAvailable) {
        this.rooms.set(roomId, {
          roomId,
          playerCount,
          maxPlayers,
          gameState,
          lastUpdated: Date.now(),
        })
      } else {
        // Remove from registry if not available
        this.rooms.delete(roomId)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response("Method not allowed", { status: 405 })
  }

  private cleanupStaleRooms() {
    const now = Date.now()
    const STALE_THRESHOLD = 60000 // 1 minute

    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastUpdated > STALE_THRESHOLD) {
        this.rooms.delete(roomId)
      }
    }
  }

  onClose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

RegistryServer satisfies Party.Worker
