import { AvatarId } from "@/lib/types"

export const AVATAR_BY_ID: Record<AvatarId, string> = {
  [AvatarId.GRIN]: "😀",
  [AvatarId.COOL]: "😎",
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
}> = [
  { id: AvatarId.GRIN, avatar: AVATAR_BY_ID[AvatarId.GRIN] },
  { id: AvatarId.COOL, avatar: AVATAR_BY_ID[AvatarId.COOL] },
  { id: AvatarId.NERD, avatar: AVATAR_BY_ID[AvatarId.NERD] },
  { id: AvatarId.SMILE, avatar: AVATAR_BY_ID[AvatarId.SMILE] },
  { id: AvatarId.PARTY, avatar: AVATAR_BY_ID[AvatarId.PARTY] },
  { id: AvatarId.ROBOT, avatar: AVATAR_BY_ID[AvatarId.ROBOT] },
  { id: AvatarId.ALIEN, avatar: AVATAR_BY_ID[AvatarId.ALIEN] },
  { id: AvatarId.GAMEPAD, avatar: AVATAR_BY_ID[AvatarId.GAMEPAD] },
]

export const DEFAULT_AVATAR_ID = AvatarId.GRIN

export function isAvatarId(value: string): value is AvatarId {
  return Object.values(AvatarId).includes(value as AvatarId)
}
