"use client"

import { BotDifficulty, type RoomSettings } from "@/lib/types"

interface RoomSettingsPanelProps {
  settings: RoomSettings;
  onChange: (settings: RoomSettings) => void;
}

export default function RoomSettingsPanel({
  settings,
  onChange,
}: RoomSettingsPanelProps) {
  return (
    <div className="space-y-4 bg-white/5 p-4 rounded-lg">
      <div>
        <label className="block text-white mb-2">Bot</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={settings.botEnabled}
              onChange={(e) =>
                onChange({ ...settings, botEnabled: e.target.checked })
              }
              className="w-4 h-4"
            />
            Enable Bot
          </label>
        </div>
      </div>

      {settings.botEnabled && (
        <div>
          <label className="block text-white mb-2">Bot Difficulty</label>
          <select
            value={settings.botDifficulty}
            onChange={(e) =>
              onChange({
                ...settings,
                botDifficulty: e.target.value as BotDifficulty,
              })
            }
            className="w-full px-3 py-2 bg-white/20 text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <option value={BotDifficulty.EASY}>Easy</option>
            <option value={BotDifficulty.MEDIUM}>Medium</option>
            <option value={BotDifficulty.CHAOS}>Chaos</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-white mb-2">
          Speed: {settings.speedMultiplier}x
        </label>
        <input
          type="range"
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
    </div>
  )
}
