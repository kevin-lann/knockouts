"use client"

import { useState } from "react"
import { useGameStore } from "@/lib/store"
import { ClientMessageType, type ClientMessage } from "@shared/types"
import PlayerList from "../lobby/PlayerList"
import LeaveRoomButton from "../room/LeaveRoomButton"
import Button, { ButtonVariant } from "../general/Button"
import Card from "../general/Card"

interface ScoreboardViewProps {
  roomId: string
  send: (message: ClientMessage) => void
}

export default function ScoreboardView({ send }: ScoreboardViewProps) {
  const { roundResults, correctAnswers, players, round, playerId, timer } =
    useGameStore()
  const [isStartingNextRound, setIsStartingNextRound] = useState(false)
  const isCurrentPlayerHost = players.find(
    (player) => player.id === playerId
  )?.isHost
  const countdownLabel = Math.max(timer, 0)
  const eliminatedPlayers = players
    .filter((player) => player.isEliminated)
    .map((player) => player.id)

  const handleNextRound = () => {
    if (isStartingNextRound) {
      return
    }

    setIsStartingNextRound(true)
    send({ type: ClientMessageType.NEXT_ROUND })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 relative">
          <h1 className="text-3xl font-bold mb-2 text-center">
            Round {round} Results
          </h1>
          <div className="absolute top-4 right-4">
            <LeaveRoomButton send={send} />
          </div>
          <div className="absolute top-4 left-4">
            {isCurrentPlayerHost && (
              <Button
                onClick={handleNextRound}
                variant={ButtonVariant.YELLOW}
                className="w-full px-4 py-2"
                disabled={isStartingNextRound}
              >
                {isStartingNextRound
                  ? "Starting next round..."
                  : `Next Round (${countdownLabel}s)`}
              </Button>
            )}

            {!isCurrentPlayerHost && (
              <p className="text-left p-4 w-[70%] text-sm">
                Waiting for host to start next round... ({countdownLabel}s)
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-4 p-2 md:flex-row">
            {roundResults && (
              <div className="mb-8 flex-1 min-w-0">
                <h2 className="text-xl font-semibold mb-4">Answers</h2>
                <div className="space-y-2">
                  {roundResults
                    .filter(
                      (result) =>
                        result.answer ||
                        !eliminatedPlayers.includes(result.playerId)
                    )
                    .map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 border-2 ${
                          result.isValid && !result.isDuplicate
                            ? "bg-brand-cyan/30 border-black"
                            : result.isDuplicate
                            ? "bg-brand-pink/30 border-black"
                            : "bg-background border-black"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold">
                              {result.playerName}
                            </span>
                            <span className="ml-2">{result.answer}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {result.isDuplicate && (
                              <span className="text-sm">Duplicate</span>
                            )}
                            {!result.isValid && (
                              <span className="text-sm">Wrong</span>
                            )}
                            {result.isValid && !result.isDuplicate && (
                              <span className="text-sm font-bold">
                                +{result.points} point
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
              <PlayerList players={players.sort((a, b) => b.score - a.score)} />
            </div>
          </div>

          {correctAnswers && correctAnswers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">All Valid Answers</h2>
              <div className="flex flex-wrap gap-2">
                {correctAnswers.map((answer, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-background border border-black text-sm"
                  >
                    {answer}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
