"use client"

import { IconId, type Player } from "@shared/types"
import { getIconById } from "../../lib/icon"

interface PlayerListProps {
  players: Player[];
}

export default function PlayerList({ players }: PlayerListProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          className={`flex items-center gap-3 p-3 bg-white/10 rounded-lg ${player.isEliminated ? "opacity-50" : ""}`}
        >
          <span className="text-2xl">{player.avatar}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{player.name}</span>
              {player.hasHighestScore && getIconById(IconId.CROWN)}
              {player.isHost && (
                <span className="text-xs bg-yellow-500/30 text-yellow-200 px-2 py-1 rounded">
                  Host
                </span>
              )}
              {player.isEliminated && (
                <span className="text-xs bg-gray-500/30 text-gray-200 px-2 py-1 rounded">
                  Eliminated
                </span>
              )}
              {player.isBot && (
                <span className="text-xs bg-gray-500/30 text-gray-200 px-2 py-1 rounded">
                  Bot
                </span>
              )}
            </div>
            <div className="text-white/60 text-sm">Score: {player.score}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
