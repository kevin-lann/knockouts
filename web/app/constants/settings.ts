import {
  BotDifficulty,
  DEFAULT_BOT_COUNT,
  DEFAULT_MAX_ROUNDS,
  RoomSettings,
} from "@shared/types"

export const DEFAULT_SETTINGS: RoomSettings = {
  botEnabled: true,
  botCount: DEFAULT_BOT_COUNT,
  botDifficulty: BotDifficulty.MEDIUM,
  themes: null,
  speedMultiplier: 1.0,
  maxRounds: DEFAULT_MAX_ROUNDS,
}
