import type { Player } from "@shared/types"

/**
 * Resets hasHighestScore flag for each player and determines highest
 * scoring players
 * @returns Player[], where each player has the highest score value 
 *          and are not a bot or eliminated
 */
export function getHighestScoringPlayers(
  players: Map<string, Player>
): Player[] {
  let leadingPlayers: Player[] = []
  let highestScore = 1

  for (const player of players.values()) {
    player.hasHighestScore = false

    if (player.isBot || player.isEliminated) {
      continue
    }

    if (player.score > highestScore) {
      highestScore = player.score
      leadingPlayers = [player]
    } else if (player.score == highestScore) {
      leadingPlayers.push(player)
    }
  }

  const alivePlayers = Array.from(players.values()).filter(
    (p) => !p.isBot && !p.isEliminated
  )

  if (alivePlayers.length == 1) {
    return alivePlayers
  }

  return leadingPlayers
}
