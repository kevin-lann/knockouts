import type { Player, RoomSettings } from "@shared/types"
import {
  DEFAULT_BOT_COUNT,
  DEFAULT_MAX_ROUNDS,
  MAX_BOT_COUNT,
  MAX_ROUNDS,
  MIN_BOT_COUNT,
  MIN_ROUNDS,
} from "@shared/types"
import { BOT_ID_PREFIX } from "./server-constants"

export function getHumanPlayerCount(players: Map<string, Player>) {
  return Array.from(players.values()).filter((player) => !player.isBot).length
}

export function getBotIndex(botId: string) {
  if (!botId.startsWith(BOT_ID_PREFIX)) {
    return Number.MAX_SAFE_INTEGER
  }

  const index = Number.parseInt(botId.slice(BOT_ID_PREFIX.length), 10)
  if (Number.isNaN(index)) {
    return Number.MAX_SAFE_INTEGER
  }

  return index
}

export function getBotPlayers(players: Map<string, Player>) {
  return Array.from(players.entries())
    .filter(([, player]) => player.isBot)
    .sort(([aId], [bId]) => getBotIndex(aId) - getBotIndex(bId))
}

export function normalizeBotCount(botCount: number | undefined): number {
  if (typeof botCount !== "number" || !Number.isFinite(botCount)) {
    return DEFAULT_BOT_COUNT
  }

  const normalized = Math.floor(botCount)
  if (normalized < MIN_BOT_COUNT) {
    return MIN_BOT_COUNT
  }

  if (normalized > MAX_BOT_COUNT) {
    return MAX_BOT_COUNT
  }

  return normalized
}

export function getDesiredBotCount(settings: RoomSettings) {
  if (!settings.botEnabled) {
    return MIN_BOT_COUNT
  }
  return normalizeBotCount(settings.botCount)
}

export function normalizeMaxRounds(maxRounds: number | undefined): number {
  if (typeof maxRounds !== "number" || !Number.isFinite(maxRounds)) {
    return DEFAULT_MAX_ROUNDS
  }

  const normalized = Math.floor(maxRounds)
  if (normalized < MIN_ROUNDS) {
    return MIN_ROUNDS
  }

  if (normalized > MAX_ROUNDS) {
    return MAX_ROUNDS
  }

  return normalized
}

export function isGameEnded(players: Map<string, Player>): boolean {
  const humanPlayers = Array.from(players.values()).filter((p) => !p.isBot)
  const alivePlayers = humanPlayers.filter((p) => !p.isEliminated)

  if (humanPlayers.length === 1) {
    return alivePlayers.length < 1
  }

  return alivePlayers.length <= 1
}
