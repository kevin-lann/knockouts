import { BotDifficulty, RoomSettings } from "@/lib/types"

export const DEFAULT_SETTINGS: RoomSettings = {
  botEnabled: true,
  botDifficulty: BotDifficulty.MEDIUM,
  theme: null,
  speedMultiplier: 1.0,
}
