"use client"

import {
  BotDifficulty,
  MAX_ROUNDS,
  MIN_ROUNDS,
  type RoomSettings,
} from "@shared/types"
import Checkbox from "@/components/general/Checkbox"
import Slider from "@/components/general/Slider"

interface RoomSettingsPanelProps {
  settings: RoomSettings
  onChange: (settings: RoomSettings) => void
}

export default function RoomSettingsPanel({
  settings,
  onChange,
}: RoomSettingsPanelProps) {
  return (
    <div className="space-y-4 bg-white border-2 border-[var(--foreground)] p-4 shadow-[2px_2px_0_0_var(--foreground)]">
      <div>
        <label className="block mb-2">Bot</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={settings.botEnabled}
              onChange={(e) =>
                onChange({ ...settings, botEnabled: e.target.checked })
              }
            />
            Enable Bot
          </label>
        </div>
      </div>

      {settings.botEnabled && (
        <div>
          <label className="block mb-2">Bot Difficulty</label>
          <select
            value={settings.botDifficulty}
            onChange={(e) =>
              onChange({
                ...settings,
                botDifficulty: e.target.value as BotDifficulty,
              })
            }
            className="w-full px-3 py-2 bg-white border-2 border-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <option value={BotDifficulty.EASY}>Easy</option>
            <option value={BotDifficulty.MEDIUM}>Medium</option>
            <option value={BotDifficulty.CHAOS}>Chaos</option>
          </select>
        </div>
      )}

      <div>
        <label className="block mb-2">
          Speed: {settings.speedMultiplier}x
        </label>
        <Slider
          min="0.5"
          max="2"
          step="0.1"
          value={settings.speedMultiplier}
          onChange={(e) =>
            onChange({
              ...settings,
              speedMultiplier: parseFloat(e.target.value),
            })
          }
          className="w-full"
        />
      </div>

      <div>
        <label className="block mb-2">
          Max Rounds: {settings.maxRounds}
        </label>
        <Slider
          min={MIN_ROUNDS.toString()}
          max={MAX_ROUNDS.toString()}
          step="1"
          value={settings.maxRounds}
          onChange={(e) =>
            onChange({
              ...settings,
              maxRounds: parseInt(e.target.value, 10),
            })
          }
          className="w-full"
        />
      </div>
    </div>
  )
}
