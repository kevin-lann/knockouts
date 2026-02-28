import { BotDifficulty, RoomSettings } from "@shared/types"

export const DEFAULT_SETTINGS: RoomSettings = {
  botEnabled: true,
  botDifficulty: BotDifficulty.MEDIUM,
  theme: null,
  speedMultiplier: 1.0,
}
