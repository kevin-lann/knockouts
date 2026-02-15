import { NextResponse } from "next/server"
import { createPublicRoomId } from "@/lib/roomId"

const PARTYKIT_HOST =
  typeof process.env.NEXT_PUBLIC_PARTYKIT_HOST !== "undefined"
    ? process.env.NEXT_PUBLIC_PARTYKIT_HOST
    : "localhost:1999"

interface RegistryRoom {
  roomId: string
  playerCount: number
  maxPlayers: number
}

interface RegistryResponse {
  rooms: RegistryRoom[]
}

export async function GET() {
  try {
    const protocol = PARTYKIT_HOST.startsWith("localhost") ? "http" : "https"
    const registryUrl = `${protocol}://${PARTYKIT_HOST}/parties/registry/main`
    
    const response = await fetch(registryUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000),
    })

    if (response.ok) {
      const data = (await response.json()) as RegistryResponse
      
      // Return the first available room (sorted by most recently updated)
      if (data.rooms && data.rooms.length > 0) {
        const room = data.rooms[0]
        return NextResponse.json({
          roomId: room.roomId,
          available: true,
          playerCount: room.playerCount,
          maxPlayers: room.maxPlayers,
          gameState: "LOBBY",
        })
      }
    }
  } catch (error) {
    console.error("Error querying registry:", error)
    // Fall through to create new room
  }

  // No available room found in registry, create a new one
  const newRoomId = createPublicRoomId()
  return NextResponse.json({
    roomId: newRoomId,
    available: true,
    playerCount: 0,
    maxPlayers: 8,
    gameState: "LOBBY",
  })
}
