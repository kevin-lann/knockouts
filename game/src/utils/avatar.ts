import { AvatarId } from "@shared/types"

const AVATAR_BY_ID: Record<AvatarId, string> = {
  [AvatarId.GRIN]: "😀",
  [AvatarId.COOL]: "😎",
  [AvatarId.NERD]: "🤓",
  [AvatarId.SMILE]: "😊",
  [AvatarId.PARTY]: "🥳",
  [AvatarId.ROBOT]: "🤖",
  [AvatarId.ALIEN]: "👾",
  [AvatarId.GAMEPAD]: "🎮",
}

const DEFAULT_AVATAR_ID = AvatarId.GRIN

function isAvatarId(value: string): value is AvatarId {
  return Object.values(AvatarId).includes(value as AvatarId)
}

export function getAvatarById(avatarId: string) {
  if (!isAvatarId(avatarId)) {
    return AVATAR_BY_ID[DEFAULT_AVATAR_ID]
  }
  return AVATAR_BY_ID[avatarId]
}
