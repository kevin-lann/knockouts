import { neon } from "@neondatabase/serverless"
import type { Question, Answer } from "@shared/types"
import { MEAN_END_MULTIPLIER, MEAN_START_MULTIPLIER, ROUNDS_UNTIL_MEAN_END } from "./constants/magic-numbers"
import { BotDifficulty } from "@shared/types"

let sql: ReturnType<typeof neon> | null = null

function getSql() {
  if (sql) {
    return sql
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set")
  }

  sql = neon(databaseUrl)
  return sql
}

export interface QuestionWithAnswers {
  question: Question
  answers: Answer[]
}

interface QuestionDbRow extends Question {
  answers: Answer[] | string
}

interface AnswerDbRow {
  id: string
  question_id: string
  display_text: string
  variants: string[] | unknown
  popularity_rank: number
}

interface WeightedQuestion extends QuestionDbRow {
  weight: number
}

/**
 * Fetch a question based on the selection algorithm:
 * - Exclude questions where answer_count < alivePlayerCount
 * - Select based on weighted random selection centered around MEAN_START_MULTIPLIER x (#players) initially (Inverse weighted distribution, more "spikey" than normal distribution in terms of luck spikes)
 * - Gradually shift mean towards 2x(players) as rounds progress
 */
export async function fetchQuestion(
  alivePlayerCount: number,
  round: number,
  theme?: string
): Promise<QuestionWithAnswers> {
  // First, filter out questions with insufficient answers
  // Build the questions here because we don't want to fetch the db twice per call to this function
  let query = `
    SELECT q.*, 
           COALESCE(json_agg(
             json_build_object(
               'id', a.id,
               'question_id', a.question_id,
               'display_text', a.display_text,
               'variants', a.variants,
               'popularity_rank', a.popularity_rank
             )
           ) FILTER (WHERE a.id IS NOT NULL), '[]') as answers
    FROM questions q
    LEFT JOIN answers a ON q.id = a.question_id
    WHERE q.answer_count_cache >= $1
  `

  const params: (string | number)[] = [alivePlayerCount]

  if (theme) {
    query += ` AND q.theme_slug = $2`
    params.push(theme)
  }

  query += `
    GROUP BY q.id
    HAVING COUNT(a.id) > 0
  `

  const rows = (await getSql().query(query, params)) as QuestionDbRow[]

  if (rows.length === 0) {
    throw new Error("No questions found matching criteria")
  }

  // Calculate target answer count using normal distribution
  // Mean starts at 6x players, shifts to 2x players over rounds
  const meanStart = MEAN_START_MULTIPLIER * alivePlayerCount
  const meanEnd = MEAN_END_MULTIPLIER * alivePlayerCount
  const progress = Math.min(round / ROUNDS_UNTIL_MEAN_END, 1)
  const targetMean = meanStart - (meanStart - meanEnd) * progress

  // Weight questions by how close they are to target mean
  const weightedQuestions = rows.map((row: QuestionDbRow): WeightedQuestion => {
    const answerCount = row.answer_count_cache
    const distance = Math.abs(answerCount - targetMean)
    // Higher weight for questions closer to target
    const weight = 1 / (1 + distance / alivePlayerCount)
    return { ...row, weight }
  })

  // Select randomly weighted by distance to target
  const totalWeight = weightedQuestions.reduce(
    (sum: number, q: WeightedQuestion) => sum + q.weight,
    0
  )
  let random = Math.random() * totalWeight
  let selected = weightedQuestions[0]

  for (const q of weightedQuestions) {
    random -= q.weight
    if (random <= 0) {
      selected = q
      break
    }
  }

  // Parse answers - handle both array and JSONB formats
  let answersArray = selected.answers
  if (typeof answersArray === "string") {
    answersArray = JSON.parse(answersArray)
  }
  if (!Array.isArray(answersArray)) {
    answersArray = []
  }

  return {
    question: {
      id: selected.id,
      prompt: selected.prompt,
      theme_slug: selected.theme_slug,
      difficulty: selected.difficulty,
      answer_count_cache: selected.answer_count_cache,
    },
    answers: answersArray.map((a: AnswerDbRow) => ({
      id: a.id,
      question_id: a.question_id,
      display_text: a.display_text,
      variants: Array.isArray(a.variants) ? a.variants : [],
      popularity_rank: a.popularity_rank,
    })),
  }
}

/**
 * Get bot answer based on difficulty level
 */
export async function getBotAnswer(
  questionId: string,
  difficulty: BotDifficulty
): Promise<Answer> {
  let rankFilter = ""
  const params: (string | number)[] = [questionId]

  switch (difficulty) {
    case BotDifficulty.EASY:
      // Popular answers (rank 20-50)
      rankFilter = "AND popularity_rank BETWEEN $2 AND $3"
      params.push(20, 50)
      break
    case BotDifficulty.MEDIUM:
      // Medium popularity (rank 5-20)
      rankFilter = "AND popularity_rank BETWEEN $2 AND $3"
      params.push(5, 20)
      break
    case BotDifficulty.CHAOS:
      // Most common answer (rank 1)
      rankFilter = "AND popularity_rank = $2"
      params.push(1)
      break
  }

  const query = `
    SELECT id, question_id, display_text, variants, popularity_rank
    FROM answers
    WHERE question_id = $1 ${rankFilter}
    ORDER BY RANDOM()
    LIMIT 1
  `

  const rows = (await getSql().query(query, params)) as AnswerDbRow[]

  if (rows.length === 0) {
    // Fallback: get any answer if no match
    const fallbackRows = (await getSql().query(
      `SELECT id, question_id, display_text, variants, popularity_rank
       FROM answers
       WHERE question_id = $1
       ORDER BY RANDOM()
       LIMIT 1`,
      [questionId]
    )) as AnswerDbRow[]
    if (fallbackRows.length === 0) {
      throw new Error(`No answers found for question ${questionId}`)
    }
    const row = fallbackRows[0]
    return {
      id: row.id,
      question_id: row.question_id,
      display_text: row.display_text,
      variants: Array.isArray(row.variants) ? row.variants : [],
      popularity_rank: row.popularity_rank,
    }
  }

  const row = rows[0]
  return {
    id: row.id,
    question_id: row.question_id,
    display_text: row.display_text,
    variants: Array.isArray(row.variants) ? row.variants : [],
    popularity_rank: row.popularity_rank,
  }
}
