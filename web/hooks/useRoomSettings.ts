"use client"

import { useGameStore } from "@/lib/store"

export function useRoomSettings() {
  const settings = useGameStore((state) => state.roomSettings)
  const setSettings = useGameStore((state) => state.setRoomSettings)
  const resetSettings = useGameStore((state) => state.resetRoomSettings)

  return {
    settings,
    setSettings,
    resetSettings,
  }
}
