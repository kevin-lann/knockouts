import { AVATAR_OPTIONS, AvatarId, DEFAULT_AVATAR_ID } from "@shared/types"

const AVATAR_IMAGE_PATH_BY_ID: Record<AvatarId, string> = Object.fromEntries(
  AVATAR_OPTIONS.map((option) => [option.id, option.imagePath])
) as Record<AvatarId, string>

function isAvatarId(value: string): value is AvatarId {
  return Object.values(AvatarId).includes(value as AvatarId)
}

export function getAvatarImagePathById(avatarId: string) {
  if (!isAvatarId(avatarId)) {
    return AVATAR_IMAGE_PATH_BY_ID[DEFAULT_AVATAR_ID]
  }
  return AVATAR_IMAGE_PATH_BY_ID[avatarId]
}
