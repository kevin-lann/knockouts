import type { Answer } from "../types"
import levenshtein from "js-levenshtein"

/**
 * Normalize input string for comparison
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

export function getLevenshteinThreshold(input: string): number {
  return Math.floor(input.length * 0.3)
}

/**
 * Validate user input against valid answers
 * Returns the matching Answer object or null
 */
export function validateAnswer(
  userInput: string,
  validAnswers: Answer[]
): Answer | null {
  const normalizedInput = normalize(userInput)

  return (
    validAnswers.find((answer) =>
      answer.variants.some((variant) => normalize(variant) === normalizedInput)
    ) ||
    validAnswers.find(
      (answer) =>
        levenshtein(normalizedInput, normalize(answer.display_text)) <=
        getLevenshteinThreshold(normalize(answer.display_text))
    ) ||
    null
  )
}

/**
 * Find duplicate answers among submissions
 * Returns Set of player IDs who submitted duplicate answers
 */
export function findDuplicates(
  validatedAnswers: Map<string, Answer | null>
): Set<string> {
  // NOTE: duplicate answers that are not correct will not be flagged
  const duplicates = new Set<string>()
  const answers = new Map<string, string[]>()

  // Group players by validated answer
  for (const [playerId, answer] of validatedAnswers) {
    const answer_text = answer?.display_text
    if (!answer_text) continue

    if (!answers.has(answer_text)) {
      answers.set(answer_text, [])
    }
    answers.get(answer_text)!.push(playerId)
  }

  // Mark players with duplicates (2+ players with same answer)
  for (const playerIds of answers.values()) {
    if (playerIds.length > 1) {
      for (const playerId of playerIds) {
        duplicates.add(playerId)
      }
    }
  }

  return duplicates
}
