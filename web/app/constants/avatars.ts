import { AvatarId } from "@shared/types"

export const AVATAR_BY_ID: Record<AvatarId, string> = {
  [AvatarId.GRIN]: "😀",
  [AvatarId.COOL]: "😎"
  [AvatarId.NERD]: "🤓",
  [AvatarId.SMILE]: "😊",
  [AvatarId.PARTY]: "🥳",
  [AvatarId.ROBOT]: "🤖",
  [AvatarId.ALIEN]: "👾",
  [AvatarId.GAMEPAD]: "🎮",
}

export const AVATAR_OPTIONS: ReadonlyArray<{
  id: AvatarId
  avatar: string
}> = Object.entries(AVATAR_BY_ID).map(([id, avatar]) => ({ id: id as AvatarId, avatar }))


export const DEFAULT_AVATAR_ID = AvatarId.GRIN

export function isAvatarId(value: string): value is AvatarId {
  return Object.values(AvatarId).includes(value as AvatarId)
}
