import type { Question, Answer } from "@shared/types"
import { BotDifficulty } from "@shared/types"
import {
  MEAN_END_MULTIPLIER,
  MEAN_START_MULTIPLIER,
  ROUNDS_UNTIL_MEAN_END,
} from "../constants/magic-numbers"
import { FEATURE_FLAGS } from "../constants/feature-flags"
import { executeSupabase, getSupabaseClient } from "./config"

export interface QuestionWithAnswers {
  question: Question
  answers: Answer[]
}

interface AnswerDbRow {
  id: string
  question_id: string
  display_text: string
  variants: string[] | unknown
  popularity_rank: number
}

interface QuestionDbRow {
  id: string
  prompt: string
  theme_slug: string
  difficulty: number
  answer_count_cache: number
  answers: AnswerDbRow[] | string | null
}

interface WeightedQuestion extends QuestionDbRow {
  weight: number
}

interface SupabaseQuestionRow {
  id: string
  prompt: string
  theme_slug: string
  difficulty: number
  answer_count_cache: number
  answers: AnswerDbRow[] | null
}

function normalizeAnswers(
  answers: AnswerDbRow[] | string | null | undefined
): Answer[] {
  let answersArray: unknown = answers

  if (typeof answersArray === "string") {
    answersArray = JSON.parse(answersArray)
  }

  if (!Array.isArray(answersArray)) {
    return []
  }

  return answersArray.map((a: AnswerDbRow) => ({
    id: a.id,
    question_id: a.question_id,
    display_text: a.display_text,
    variants: Array.isArray(a.variants) ? a.variants : [],
    popularity_rank: a.popularity_rank,
  }))
}

function toQuestionWithAnswers(row: QuestionDbRow): QuestionWithAnswers {
  const answers = normalizeAnswers(row.answers)
  return {
    question: {
      id: row.id,
      prompt: row.prompt,
      theme_slug: row.theme_slug,
      difficulty: row.difficulty,
      answer_count_cache: row.answer_count_cache,
    },
    answers,
  }
}

function pickRandomItem<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length)
  return items[index]
}

async function fetchQuestionsSupabase(
  alivePlayerCount: number,
  themes?: string[]
): Promise<QuestionDbRow[]> {
  const client = getSupabaseClient()

  let query = client
    .from("questions")
    .select(
      "id,prompt,theme_slug,difficulty,answer_count_cache,answers(id,question_id,display_text,variants,popularity_rank)"
    )
    .gte("answer_count_cache", alivePlayerCount)

  if (themes && themes.length > 0) {
    query = query.in("theme_slug", themes)
  }

  const { data, error } = await executeSupabase<SupabaseQuestionRow[]>(
    query,
    "Supabase questions query timed out"
  )

  if (error) {
    throw new Error(`Supabase questions query failed: ${error.message}`)
  }

  const rows = (data ?? []) as SupabaseQuestionRow[]

  return rows
    .map((row) => ({
      id: row.id,
      prompt: row.prompt,
      theme_slug: row.theme_slug,
      difficulty: row.difficulty,
      answer_count_cache: row.answer_count_cache,
      answers: row.answers ?? [],
    }))
    .filter((row) => normalizeAnswers(row.answers).length > 0)
}

export async function fetchQuestion(
  alivePlayerCount: number,
  round: number,
  themes?: string[]
): Promise<QuestionWithAnswers> {
  if (FEATURE_FLAGS.RANDOM_QUESTION_SELECTION) {
    return fetchRandomQuestion(alivePlayerCount, round, themes)
  }

  const rows = await fetchQuestionsSupabase(alivePlayerCount, themes)

  if (rows.length === 0) {
    throw new Error("No questions found matching criteria")
  }

  const meanStart = MEAN_START_MULTIPLIER * alivePlayerCount
  const meanEnd = MEAN_END_MULTIPLIER * alivePlayerCount
  const progress = Math.min(round / ROUNDS_UNTIL_MEAN_END, 1)
  const targetMean = meanStart - (meanStart - meanEnd) * progress

  const weightedQuestions = rows.map((row: QuestionDbRow): WeightedQuestion => {
    const answerCount = row.answer_count_cache
    const distance = Math.abs(answerCount - targetMean)
    const weight = 1 / (1 + distance / alivePlayerCount)
    return { ...row, weight }
  })

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

  return toQuestionWithAnswers(selected)
}

async function fetchRandomQuestion(
  alivePlayerCount: number,
  _round: number,
  themes?: string[]
): Promise<QuestionWithAnswers> {
  const rows = await fetchQuestionsSupabase(alivePlayerCount, themes)
  if (rows.length === 0) {
    throw new Error("No questions found matching criteria")
  }

  const row = pickRandomItem(rows)
  return toQuestionWithAnswers(row)
}

export async function getBotAnswer(
  questionId: string,
  difficulty: BotDifficulty
): Promise<Answer> {
  const client = getSupabaseClient()

  let minRank = 1
  let maxRank = 100

  switch (difficulty) {
    case BotDifficulty.EASY:
      minRank = 1
      maxRank = 100
      break
    case BotDifficulty.MEDIUM:
      minRank = 1
      maxRank = 30
      break
    case BotDifficulty.CHAOS:
      minRank = 1
      maxRank = 5
      break
  }

  const { data, error } = await executeSupabase<AnswerDbRow[]>(
    client
      .from("answers")
      .select("id,question_id,display_text,variants,popularity_rank")
      .eq("question_id", questionId)
      .gte("popularity_rank", minRank)
      .lte("popularity_rank", maxRank),
    "Supabase bot answer query timed out"
  )

  if (error) {
    throw new Error(`Supabase bot answer query failed: ${error.message}`)
  }

  const rows = (data ?? []) as AnswerDbRow[]

  if (rows.length === 0) {
    const fallback = await executeSupabase<AnswerDbRow[]>(
      client
        .from("answers")
        .select("id,question_id,display_text,variants,popularity_rank")
        .eq("question_id", questionId),
      "Supabase bot fallback query timed out"
    )

    if (fallback.error) {
      throw new Error(
        `Supabase bot fallback query failed: ${fallback.error.message}`
      )
    }

    const fallbackRows = (fallback.data ?? []) as AnswerDbRow[]
    if (fallbackRows.length === 0) {
      throw new Error(`No answers found for question ${questionId}`)
    }

    const selected = pickRandomItem(fallbackRows)
    return {
      id: selected.id,
      question_id: selected.question_id,
      display_text: selected.display_text,
      variants: Array.isArray(selected.variants) ? selected.variants : [],
      popularity_rank: selected.popularity_rank,
    }
  }

  const selected = pickRandomItem(rows)
  return {
    id: selected.id,
    question_id: selected.question_id,
    display_text: selected.display_text,
    variants: Array.isArray(selected.variants) ? selected.variants : [],
    popularity_rank: selected.popularity_rank,
  }
}
