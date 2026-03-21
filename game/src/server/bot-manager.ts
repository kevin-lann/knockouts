import type { Player, Question, RoomSettings } from "@shared/types"
import {
  BotDifficulty,
  DEFAULT_PLAYER_LIVES,
} from "@shared/types"
import { getBotAnswer } from "../db"
import { getAvatarImagePathById } from "../utils/avatar"
import { BOT_AVATAR_IDS, BOT_ID_PREFIX, BOT_NAME_PREFIX } from "./server-constants"
import { getBotPlayers, getDesiredBotCount } from "./player-utils"

export function removeAllBotsIfNoHumans(players: Map<string, Player>) {
  const humanPlayerCount = Array.from(players.values()).filter((player) => !player.isBot)
    .length

  if (humanPlayerCount > 0) {
    return
  }

  for (const [playerId, player] of players.entries()) {
    if (player.isBot) {
      players.delete(playerId)
    }
  }
}

export function syncBotsToSettings(
  players: Map<string, Player>,
  settings: RoomSettings
) {
  const desiredBotCount = getDesiredBotCount(settings)
  const existingBots = getBotPlayers(players)

  if (existingBots.length > desiredBotCount) {
    const botsToRemove = existingBots.slice(desiredBotCount)
    for (const [botId] of botsToRemove) {
      players.delete(botId)
    }
  }

  for (let index = 1; index <= desiredBotCount; index++) {
    const botId = `${BOT_ID_PREFIX}${index}`
    const existingBot = players.get(botId)
    if (existingBot) {
      existingBot.lives = DEFAULT_PLAYER_LIVES
      existingBot.isEliminated = false
      existingBot.hasSubmitted = false
      existingBot.currentAnswer = undefined
      continue
    }

    const avatarId = BOT_AVATAR_IDS[(index - 1) % BOT_AVATAR_IDS.length]
    players.set(botId, {
      id: botId,
      name: `${BOT_NAME_PREFIX}${index}`,
      avatarId,
      avatarImagePath: getAvatarImagePathById(avatarId),
      lives: DEFAULT_PLAYER_LIVES,
      score: 0,
      streak: 0,
      isHost: false,
      isBot: true,
      isEliminated: false,
      hasHighestScore: false,
      hasSubmitted: false,
    })
  }
}

export async function assignBotAnswers(
  players: Map<string, Player>,
  currentQuestion: Question | null,
  botDifficulty: BotDifficulty
) {
  if (!currentQuestion) {
    return
  }

  const botPlayers = getBotPlayers(players)
  if (botPlayers.length === 0) {
    return
  }

  await Promise.all(
    botPlayers.map(async ([, botPlayer]) => {
      try {
        const botAnswer = await getBotAnswer(currentQuestion.id, botDifficulty)
        botPlayer.currentAnswer = botAnswer.display_text
        botPlayer.hasSubmitted = true
      } catch (error) {
        botPlayer.currentAnswer = undefined
        botPlayer.hasSubmitted = false
        console.error(`Error getting answer for ${botPlayer.name}:`, error)
      }
    })
  )
}
