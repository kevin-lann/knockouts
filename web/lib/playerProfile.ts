import { AvatarId } from "@shared/types"
import { isAvatarId } from "@/app/constants/avatars"

const PLAYER_PROFILE_STORAGE_KEY = "knockouts-player-profile"

export interface PlayerProfile {
  name: string
  avatarId: AvatarId
}

export function getStoredPlayerProfile(): PlayerProfile | null {
  if (typeof window === "undefined") {
    return null
  }

  const rawProfile = window.sessionStorage.getItem(PLAYER_PROFILE_STORAGE_KEY)
  if (!rawProfile) {
    return null
  }

  try {
    const parsed = JSON.parse(rawProfile) as Partial<PlayerProfile>
    if (
      typeof parsed.name === "string" &&
      parsed.name.trim().length > 0 &&
      typeof parsed.avatarId === "string" &&
      isAvatarId(parsed.avatarId)
    ) {
      return {
        name: parsed.name.trim(),
        avatarId: parsed.avatarId,
      }
    }
  } catch (error) {
    console.error("Failed to parse stored player profile", error)
  }

  return null
}

export function setStoredPlayerProfile(profile: PlayerProfile) {
  if (typeof window === "undefined") {
    return
  }

  const normalizedProfile: PlayerProfile = {
    name: profile.name.trim(),
    avatarId: profile.avatarId,
  }

  window.sessionStorage.setItem(
    PLAYER_PROFILE_STORAGE_KEY,
    JSON.stringify(normalizedProfile)
  )
}
