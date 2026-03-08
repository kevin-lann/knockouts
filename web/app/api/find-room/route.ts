import { NextResponse } from "next/server"
import { createPublicRoomId } from "@/lib/roomId"

function normalizePartykitBaseUrl(rawHost: string) {
  const value = rawHost.trim()
  if (!value) {
    return null
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/\/+$/, "")
  }

  if (value.startsWith("ws://") || value.startsWith("wss://")) {
    const httpProtocol = value.startsWith("wss://") ? "https://" : "http://"
    return `${httpProtocol}${value.replace(/^wss?:\/\//, "").replace(/\/+$/, "")}`
  }

  const protocol = value.startsWith("localhost") ? "http://" : "https://"
  return `${protocol}${value.replace(/\/+$/, "")}`
}

interface RegistryRoom {
  roomId: string
  playerCount: number
  maxPlayers: number
}

interface RegistryResponse {
  rooms: RegistryRoom[]
}

export async function GET() {
  const configuredHost =
    process.env.PARTYKIT_HOST?.trim() ||
    process.env.NEXT_PUBLIC_PARTYKIT_HOST?.trim() ||
    "localhost:1999"
  const partykitBaseUrl = normalizePartykitBaseUrl(configuredHost)

  try {
    if (!partykitBaseUrl) {
      throw new Error("Partykit host is empty")
    }

    const registryUrl = `${partykitBaseUrl}/parties/registry/main`

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
    console.error("Error querying registry:", {
      configuredHost,
      error,
    })
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
