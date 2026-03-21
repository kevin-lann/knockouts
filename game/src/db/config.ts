import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const DEFAULT_SUPABASE_QUERY_TIMEOUT_MS = 10000

let supabaseClient: SupabaseClient | null = null
let databaseUrlOverride: string | undefined
let supabaseUrlOverride: string | undefined
let supabaseKeyOverride: string | undefined

function parseSupabaseProjectRefFromDatabaseUrl(
  databaseUrl?: string
): string | null {
  if (!databaseUrl) {
    return null
  }

  try {
    const parsed = new URL(databaseUrl)
    const username = decodeURIComponent(parsed.username)
    if (username.startsWith("postgres.")) {
      const projectRef = username.slice("postgres.".length)
      return projectRef || null
    }
  } catch {
    return null
  }

  return null
}

function getSupabaseUrl(databaseUrl?: string): string {
  const explicitUrl = supabaseUrlOverride || process.env.SUPABASE_URL?.trim()
  if (explicitUrl) {
    return explicitUrl
  }

  const projectRef = parseSupabaseProjectRefFromDatabaseUrl(databaseUrl)
  if (projectRef) {
    return `https://${projectRef}.supabase.co`
  }

  throw new Error(
    "SUPABASE_URL is not set. Set SUPABASE_URL or provide a DATABASE_URL whose username is in format postgres.<project-ref>."
  )
}

function getSupabaseKey(): string {
  const serviceRoleKey =
    supabaseKeyOverride || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (serviceRoleKey) {
    return serviceRoleKey
  }

  const anonKey = process.env.SUPABASE_ANON_KEY?.trim()
  if (anonKey) {
    return anonKey
  }

  throw new Error("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) is not set")
}

function getSupabaseQueryTimeoutMs(): number {
  const value = process.env.SUPABASE_QUERY_TIMEOUT_MS
  const parsed = value ? Number.parseInt(value, 10) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }
  return DEFAULT_SUPABASE_QUERY_TIMEOUT_MS
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export interface SupabaseResponse<T> {
  data: T | null
  error: { message: string } | null
}

export async function executeSupabase<T>(
  query: PromiseLike<SupabaseResponse<T>>,
  timeoutLabel: string
): Promise<SupabaseResponse<T>> {
  const timeoutMs = getSupabaseQueryTimeoutMs()
  return withTimeout(
    query,
    timeoutMs,
    `${timeoutLabel} after ${timeoutMs}ms`
  )
}

export function configureDatabase(
  databaseUrl?: string,
  _databaseProvider?: string,
  supabaseUrl?: string,
  supabaseKey?: string
) {
  const normalizedUrl = databaseUrl?.trim()
  const normalizedSupabaseUrl = supabaseUrl?.trim()
  const normalizedSupabaseKey = supabaseKey?.trim()

  if (
    databaseUrlOverride === normalizedUrl &&
    supabaseUrlOverride === normalizedSupabaseUrl &&
    supabaseKeyOverride === normalizedSupabaseKey
  ) {
    return
  }

  databaseUrlOverride = normalizedUrl
  supabaseUrlOverride = normalizedSupabaseUrl
  supabaseKeyOverride = normalizedSupabaseKey
  supabaseClient = null
}

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = getSupabaseUrl(databaseUrlOverride || process.env.DATABASE_URL)
  const supabaseKey = getSupabaseKey()

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return supabaseClient
}
