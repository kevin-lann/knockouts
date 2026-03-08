"use client"

import { IconId, type Player } from "@shared/types"
import { getIconById } from "../../lib/icon"

interface PlayerListProps {
  players: Player[]
}

export default function PlayerList({ players }: PlayerListProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          className={`flex items-center gap-3 p-3 bg-white border-2 border-black shadow-[2px_2px_0_0_#000] ${player.isEliminated ? "opacity-50" : ""}`}
        >
          <span className="text-2xl">{player.avatar}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{player.name}</span>
              {player.hasHighestScore && getIconById(IconId.CROWN)}
              {player.isHost && (
                <span className="text-xs bg-brand-yellow border-2 border-black px-2 py-1">
                  Host
                </span>
              )}
              {player.isEliminated && (
                <span className="text-xs bg-background border-2 border-black px-2 py-1">
                  Eliminated
                </span>
              )}
              {player.isBot && (
                <span className="text-xs bg-brand-cyan border-2 border-black px-2 py-1">
                  Bot
                </span>
              )}
            </div>
            <div className="text-sm">Score: {player.score}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
