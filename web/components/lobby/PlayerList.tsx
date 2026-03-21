"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { IconId, DEFAULT_PLAYER_LIVES, type Player } from "@shared/types"
import { AVATAR_OPTIONS } from "@/app/constants/avatars"
import { getIconById } from "../../lib/icon"
import AvatarImage from "../general/AvatarImage"
import { useGameStore } from "@/lib/store"
import { HeartIcon } from "lucide-react"

interface PlayerListProps {
  players: Player[]
  pulsingStreakPlayerIds?: ReadonlySet<string>
  streakPulseRound?: number
}

export default function PlayerList({
  players,
  pulsingStreakPlayerIds,
  streakPulseRound,
}: PlayerListProps) {
  const avatarOptionById = useMemo(
    () =>
      Object.fromEntries(AVATAR_OPTIONS.map((option) => [option.id, option])),
    []
  )
  const playerId = useGameStore((state) => state.playerId)
  const previousPlayersRef = useRef<
    Array<Pick<Player, "id" | "lives" | "isEliminated">>
  >([])
  const lifeLossTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const eliminationTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>(
    []
  )
  const [lifeLossPulseIds, setLifeLossPulseIds] = useState<Set<string>>(
    new Set()
  )
  const [eliminationPulseIds, setEliminationPulseIds] = useState<Set<string>>(
    new Set()
  )

  useEffect(() => {
    return () => {
      for (const timeout of lifeLossTimeoutsRef.current) {
        clearTimeout(timeout)
      }
      for (const timeout of eliminationTimeoutsRef.current) {
        clearTimeout(timeout)
      }
    }
  }, [])

  useEffect(() => {
    if (previousPlayersRef.current.length === 0) {
      previousPlayersRef.current = players.map((player) => ({
        id: player.id,
        lives: player.lives,
        isEliminated: player.isEliminated,
      }))
      return
    }

    const previousById = new Map(
      previousPlayersRef.current.map((player) => [player.id, player])
    )
    const playersWithLifeLoss = players
      .filter((player) => {
        const previousPlayer = previousById.get(player.id)
        return previousPlayer && player.lives < previousPlayer.lives
      })
      .map((player) => player.id)
    const playersNewlyEliminated = players
      .filter((player) => {
        const previousPlayer = previousById.get(player.id)
        return (
          previousPlayer && !previousPlayer.isEliminated && player.isEliminated
        )
      })
      .map((player) => player.id)

    if (playersWithLifeLoss.length > 0) {
      setLifeLossPulseIds((previousIds) => {
        const nextIds = new Set(previousIds)
        for (const id of playersWithLifeLoss) {
          nextIds.add(id)
        }
        return nextIds
      })

      const timeout = setTimeout(() => {
        setLifeLossPulseIds((previousIds) => {
          const nextIds = new Set(previousIds)
          for (const id of playersWithLifeLoss) {
            nextIds.delete(id)
          }
          return nextIds
        })
      }, 1200)
      lifeLossTimeoutsRef.current.push(timeout)
    }

    if (playersNewlyEliminated.length > 0) {
      setEliminationPulseIds((previousIds) => {
        const nextIds = new Set(previousIds)
        for (const id of playersNewlyEliminated) {
          nextIds.add(id)
        }
        return nextIds
      })

      const timeout = setTimeout(() => {
        setEliminationPulseIds((previousIds) => {
          const nextIds = new Set(previousIds)
          for (const id of playersNewlyEliminated) {
            nextIds.delete(id)
          }
          return nextIds
        })
      }, 1500)
      eliminationTimeoutsRef.current.push(timeout)
    }

    previousPlayersRef.current = players.map((player) => ({
      id: player.id,
      lives: player.lives,
      isEliminated: player.isEliminated,
    }))
  }, [players])

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {players.map((player) => {
        const avatarOption = avatarOptionById[player.avatarId]
        const avatarFallback = avatarOption?.fallback ?? "🙂"
        const avatarAlt = avatarOption?.alt ?? "Player avatar"
        const shouldPulseStreak =
          pulsingStreakPlayerIds?.has(player.id) ?? false
        const pulseAnimationClass = shouldPulseStreak
          ? streakPulseRound && streakPulseRound % 2 === 0
            ? "animate-[pulse_600ms_ease-in-out_3]"
            : "animate-[pulse_700ms_ease-in-out_3]"
          : ""
        const shouldAnimateLifeLoss = lifeLossPulseIds.has(player.id)
        const shouldAnimateElimination = eliminationPulseIds.has(player.id)
        const rowAnimationClass = shouldAnimateElimination
          ? "player-row-eliminated-anim"
          : shouldAnimateLifeLoss
          ? "player-row-life-loss-anim"
          : ""
        const displayedLives = Math.max(
          Math.min(player.lives, DEFAULT_PLAYER_LIVES),
          0
        )

        return (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 bg-white border-2 border-[var(--foreground)] shadow-[2px_2px_0_0_var(--foreground)] ${
              player.isEliminated ? "opacity-50" : ""
            } ${rowAnimationClass}`}
          >
            <AvatarImage
              imagePath={player.avatarImagePath}
              fallback={avatarFallback}
              alt={avatarAlt}
              className={`h-16 w-16 ${
                player.id === playerId ? "border-brand-yellow" : ""
              }`}
              fallbackClassName="text-lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{player.name}</span>
                {player.hasHighestScore && getIconById(IconId.CROWN)}
                {!player.isBot && player.streak > 0 && (
                  <span
                    className={`relative inline-flex h-6 w-6 items-center justify-center ${pulseAnimationClass}`}
                    title={`Current streak: ${player.streak}`}
                    aria-label={`${player.streak} correct answers in a row`}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      🔥
                    </span>
                    <span className="flex text-[var(--foreground)] items-center justify-center text-[10px] font-bold">
                      {player.streak}
                    </span>
                  </span>
                )}
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
              {!player.isBot && (
                <div className="text-sm">Score: {player.score}</div>
              )}
              {!player.isBot && (
                <div
                  className={`text-sm flex items-center gap-2 ${
                    shouldAnimateLifeLoss ? "player-lives-loss-anim" : ""
                  }`}
                >
                  <span>Lives:</span>
                  <span
                    className="inline-flex items-center gap-1"
                    aria-label={`${player.lives} lives remaining`}
                  >
                    {Array.from({ length: DEFAULT_PLAYER_LIVES }).map(
                      (_, index) => (
                        <span
                          key={`${player.id}-life-${index}`}
                          className={`h-3 w-3`}
                        >
                          <HeartIcon fill={index < displayedLives ? "currentColor" : "none"} className={`h-3 w-3 ${index < displayedLives ? "text-brand-pink" : "text-white/30"}`} />
                        </span>
                      )
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
