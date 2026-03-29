import { useRef, useSyncExternalStore } from "react"
import {
  parsePlayerProfile,
  PLAYER_PROFILE_STORAGE_KEY,
  PLAYER_PROFILE_EVENT_NAME,
  PlayerProfile,
} from "@/lib/playerProfile"
import { DEFAULT_AVATAR_ID } from "@shared/types"

const defaultProfile: PlayerProfile = { name: "", avatarId: DEFAULT_AVATAR_ID }

export const usePlayerDetails = (): PlayerProfile => {
  const cachedRawProfileRef = useRef<string | null>(null)
  const cachedProfileRef = useRef<PlayerProfile>(defaultProfile)

  const subscribe = (onStoreChange: () => void) => {
    if (typeof window === "undefined") {
      return () => {}
    }

    window.addEventListener("storage", onStoreChange)
    window.addEventListener(PLAYER_PROFILE_EVENT_NAME, onStoreChange)

    return () => {
      window.removeEventListener("storage", onStoreChange)
      window.removeEventListener(PLAYER_PROFILE_EVENT_NAME, onStoreChange)
    }
  }

  const getSnapshot = () => {
    if (typeof window === "undefined") {
      return defaultProfile
    }

    const rawProfile = window.sessionStorage.getItem(PLAYER_PROFILE_STORAGE_KEY)
    if (rawProfile === cachedRawProfileRef.current) {
      return cachedProfileRef.current
    }

    cachedRawProfileRef.current = rawProfile
    if (!rawProfile) {
      cachedProfileRef.current = defaultProfile
      return cachedProfileRef.current
    }

    cachedProfileRef.current = parsePlayerProfile(rawProfile) ?? defaultProfile
    return cachedProfileRef.current
  }

  return useSyncExternalStore(subscribe, getSnapshot, () => defaultProfile)
}
 
