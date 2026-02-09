import type { Answer } from "./types";
import levenshtein from "js-levenshtein";

const LEVENSHTEIN_THRESHOLD = 3;

/**
 * Normalize input string for comparison
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Validate user input against valid answers
 * Returns the matching Answer object or null
 */
export function validateAnswer(
  userInput: string,
  validAnswers: Answer[]
): Answer | null {
  const normalizedInput = normalize(userInput);

  console.log('>>> userInput', userInput);
  console.log('>>> normalizedInput', normalizedInput);

  return (
    validAnswers.find(
      (answer) =>
        answer.variants.some(
          (variant) => normalize(variant) === normalizedInput
        ) ||
        validAnswers.find(
          (answer) =>
            levenshtein(normalizedInput, answer.display_text) <=
            LEVENSHTEIN_THRESHOLD
        )
    ) || null
  );
}

/**
 * Find duplicate answers among submissions
 * Returns Set of player IDs who submitted duplicate answers
 */
export function findDuplicates(
  submissions: Map<string, string>,
  _validAnswers: Answer[]
): Set<string> {
  const duplicates = new Set<string>();
  const normalizedAnswers = new Map<string, string[]>();

  // Group players by normalized answer
  for (const [playerId, answer] of submissions.entries()) {
    const normalized = normalize(answer);
    if (!normalizedAnswers.has(normalized)) {
      normalizedAnswers.set(normalized, []);
    }
    normalizedAnswers.get(normalized)!.push(playerId);
  }

  // Mark players with duplicates (2+ players with same answer)
  for (const playerIds of normalizedAnswers.values()) {
    if (playerIds.length > 1) {
      for (const playerId of playerIds) {
        duplicates.add(playerId);
      }
    }
  }

  return duplicates;
}
