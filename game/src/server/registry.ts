import type * as Party from "partykit/server"
import type { GameState } from "@shared/types"

export async function notifyRegistry(args: {
  room: Party.Room
  isPublic: boolean
  gameState: GameState
  playerCount: number
  maxPlayers: number
}) {
  if (!args.isPublic) {
    return
  }

  try {
    const registryParty = args.room.context.parties.registry
    const registryRoom = registryParty.get("main")

    await registryRoom.fetch({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: args.room.id,
        playerCount: args.playerCount,
        maxPlayers: args.maxPlayers,
        gameState: args.gameState,
      }),
    })
  } catch (error) {
    console.error("Failed to notify registry:", error)
  }
}

export function startRegistryHeartbeat(
  callback: () => void,
  existingInterval: ReturnType<typeof setInterval> | null
) {
  if (existingInterval) {
    return existingInterval
  }

  return setInterval(() => {
    callback()
  }, 20000)
}

export function stopRegistryHeartbeat(
  interval: ReturnType<typeof setInterval> | null
) {
  if (!interval) {
    return null
  }

  clearInterval(interval)
  return null
}
