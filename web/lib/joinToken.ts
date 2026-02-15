import { AvatarId } from "@/lib/types"

export interface JoinTokenPayload {
  roomId: string
  clientId: string
  name: string
  avatarId: AvatarId
  iat: number
  exp: number
}

const JOIN_TOKEN_TYP = "KNOCKOUTS_JOIN"
const JOIN_TOKEN_ALG = "HS256"
const TOKEN_TTL_SECONDS = 60 * 5

function getJoinTokenSecret() {
  return process.env.JOIN_TOKEN_SECRET || "dev-only-join-token-secret"
}

function base64UrlEncode(input: string) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return base64UrlEncode(binary)
}

async function signHmacSha256(data: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function createJoinToken(input: {
  roomId: string
  clientId: string
  name: string
  avatarId: AvatarId
}) {
  const now = Math.floor(Date.now() / 1000)
  const payload: JoinTokenPayload = {
    roomId: input.roomId,
    clientId: input.clientId,
    name: input.name.trim(),
    avatarId: input.avatarId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }

  const header = {
    typ: JOIN_TOKEN_TYP,
    alg: JOIN_TOKEN_ALG,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = await signHmacSha256(signingInput, getJoinTokenSecret())

  return `${signingInput}.${signature}`
}
