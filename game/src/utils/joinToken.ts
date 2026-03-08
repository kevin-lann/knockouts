import { AvatarId } from "@shared/types"

interface JoinTokenHeader {
  typ: string
  alg: string
}

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

function getJoinTokenSecret(explicitSecret?: string) {
  const secret = explicitSecret?.trim() || process.env.JOIN_TOKEN_SECRET?.trim()
  if (secret) {
    return secret
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-join-token-secret"
  }

  throw new Error("JOIN_TOKEN_SECRET is not set")
}

function base64UrlToBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4
  if (padding === 0) {
    return normalized
  }
  return `${normalized}${"=".repeat(4 - padding)}`
}

function base64UrlDecode(value: string) {
  return atob(base64UrlToBase64(value))
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
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

function isAvatarId(value: string): value is AvatarId {
  return Object.values(AvatarId).includes(value as AvatarId)
}

export async function verifyJoinToken(token: string, explicitSecret?: string) {
  const [encodedHeader, encodedPayload, signature] = token.split(".")
  if (!encodedHeader || !encodedPayload || !signature) {
    return null
  }

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader)) as JoinTokenHeader
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JoinTokenPayload

    if (header.typ !== JOIN_TOKEN_TYP || header.alg !== JOIN_TOKEN_ALG) {
      return null
    }

    if (
      typeof payload.roomId !== "string" ||
      typeof payload.clientId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.avatarId !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null
    }

    if (!payload.name.trim() || !isAvatarId(payload.avatarId)) {
      return null
    }

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return null
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`
    const expectedSignature = await signHmacSha256(
      signingInput,
      getJoinTokenSecret(explicitSecret)
    )
    if (expectedSignature !== signature) {
      return null
    }

    return {
      ...payload,
      name: payload.name.trim(),
    }
  } catch {
    return null
  }
}
