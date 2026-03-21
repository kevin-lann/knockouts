import type { Answer, Player, RoundResult } from "@shared/types"
import { POINTS_PER_ANSWER } from "@shared/types"
import { findDuplicates, validateAnswer } from "../utils/validation"

export function resetRoundSubmissions(players: Map<string, Player>) {
  for (const player of players.values()) {
    if (!player.isEliminated) {
      player.hasSubmitted = false
      player.currentAnswer = undefined
    }
  }
}

export function resetAllSubmissions(players: Map<string, Player>) {
  for (const player of players.values()) {
    player.hasSubmitted = false
    player.currentAnswer = undefined
  }
}

export function processRoundSubmissions(
  players: Map<string, Player>,
  currentAnswers: Answer[]
) {
  const submissions = new Map<string, string>()
  for (const [playerId, player] of players.entries()) {
    if (player.currentAnswer) {
      submissions.set(playerId, player.currentAnswer)
    }
  }

  const validatedAnswers = new Map<string, Answer | null>()
  for (const [playerId, answer] of submissions.entries()) {
    validatedAnswers.set(playerId, validateAnswer(answer, currentAnswers))
  }

  const duplicates = findDuplicates(validatedAnswers)
  const results: RoundResult[] = []
  const correctAnswers = currentAnswers.map((answer) => answer.display_text)

  for (const [playerId, player] of players.entries()) {
    const validated = validatedAnswers.get(playerId)
    const isDuplicate = duplicates.has(playerId)
    const isValid = validated !== null && validated !== undefined
    const points = isValid && !isDuplicate ? POINTS_PER_ANSWER : 0
    const didAnswerCorrectly = isValid && !isDuplicate

    player.score += points
    player.streak = didAnswerCorrectly ? player.streak + 1 : 0

    if (!player.isBot && !player.isEliminated && isDuplicate) {
      player.lives = Math.max(player.lives - 1, 0)
      if (player.lives === 0) {
        player.isEliminated = true
      }
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

  return { results, correctAnswers }
}
