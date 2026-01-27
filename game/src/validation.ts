import type { Answer } from "./types";

/**
 * Normalize input string for comparison
 */
export function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
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

  return (
    validAnswers.find((answer) =>
      answer.variants.some((variant) => normalize(variant) === normalizedInput)
    ) || null
  );
}

/**
 * Find duplicate answers among submissions
 * Returns Set of player IDs who submitted duplicate answers
 */
export function findDuplicates(
  submissions: Map<string, string>,
  validAnswers: Answer[]
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
  for (const [normalized, playerIds] of normalizedAnswers.entries()) {
    // Check if this normalized answer matches a valid answer
    const isValid = validAnswers.some((answer) =>
      answer.variants.some((variant) => normalize(variant) === normalized)
    );

    if (isValid && playerIds.length > 1) {
      // All players with this duplicate answer get marked
      for (const playerId of playerIds) {
        duplicates.add(playerId);
      }
    }
  }

  return duplicates;
}
