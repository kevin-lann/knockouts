"use client"

import { IconId, type Player } from "@shared/types"
import { AVATAR_OPTIONS } from "@/app/constants/avatars"
import { getIconById } from "../../lib/icon"
import AvatarImage from "../general/AvatarImage"

interface PlayerListProps {
  players: Player[]
}

export default function PlayerList({ players }: PlayerListProps) {
  const avatarOptionById = Object.fromEntries(
    AVATAR_OPTIONS.map((option) => [option.id, option])
  )

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {players.map((player) => {
        const avatarOption = avatarOptionById[player.avatarId]
        const avatarFallback = avatarOption?.fallback ?? "🙂"
        const avatarAlt = avatarOption?.alt ?? "Player avatar"

        return (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 bg-white border-2 border-[var(--foreground)] shadow-[2px_2px_0_0_var(--foreground)] ${player.isEliminated ? "opacity-50" : ""}`}
          >
            <AvatarImage
              imagePath={player.avatarImagePath}
              fallback={avatarFallback}
              alt={avatarAlt}
              className="h-16 w-16"
              fallbackClassName="text-lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{player.name}</span>
                {player.hasHighestScore && getIconById(IconId.CROWN)}
                {player.isHost && (
                  <span className="text-xs bg-brand-yellow border-2 border-[var(--foreground)] px-2 py-1">
                    Host
                  </span>
                )}
                {player.isEliminated && (
                  <span className="text-xs bg-background border-2 border-[var(--foreground)] px-2 py-1">
                    Eliminated
                  </span>
                )}
                {player.isBot && (
                  <span className="text-xs bg-brand-cyan border-2 border-[var(--foreground)] px-2 py-1">
                    Bot
                  </span>
                )}
              </div>
              <div className="text-sm">Score: {player.score}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
