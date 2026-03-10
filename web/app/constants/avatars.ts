import {
  AVATAR_OPTIONS as SHARED_AVATAR_OPTIONS,
  AvatarId,
  DEFAULT_AVATAR_ID,
} from "@shared/types"

export const AVATAR_OPTIONS = SHARED_AVATAR_OPTIONS

export function isAvatarId(value: string): value is AvatarId {
  return Object.values(AvatarId).includes(value as AvatarId)
}

export { DEFAULT_AVATAR_ID }
