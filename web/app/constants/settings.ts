import {
  BotDifficulty,
  DEFAULT_MAX_ROUNDS,
  RoomSettings,
} from "@shared/types"

export const DEFAULT_SETTINGS: RoomSettings = {
  botEnabled: true,
  botDifficulty: BotDifficulty.MEDIUM,
  themes: null,
  speedMultiplier: 1.0,
  maxRounds: DEFAULT_MAX_ROUNDS,
}
