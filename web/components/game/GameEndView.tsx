"use client"

import { useGameStore } from "@/lib/store"
import { ClientMessageType, type ClientMessage } from "@shared/types"
import PlayerList from "../lobby/PlayerList"
import LeaveRoomButton from "../room/LeaveRoomButton"
import RoomSettingsPanel from "../lobby/RoomSettingsPanel"
import { useRoomSettings } from "@/hooks/useRoomSettings"
import Button, { ButtonVariant } from "../general/Button"
import Card from "../general/Card"

interface GameEndViewProps {
  roomId: string
  send: (message: ClientMessage) => void
}

export default function GameEndView({ send }: GameEndViewProps) {
  const { roundResults, correctAnswers, players, playerId } = useGameStore()
  const { settings, setSettings } = useRoomSettings()
  const isCurrentPlayerHost = players.find(
    (player) => player.id === playerId
  )?.isHost
  const onePlayerRemaining = players.length === 1

  const handleNewGame = () => {
    send({ type: ClientMessageType.START_GAME, settings })
  }

  const handleStartNewLobby = () => {
    send({ type: ClientMessageType.START_NEW_LOBBY })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 relative">
          <h1 className="text-3xl font-bold mb-2 text-center">
            Game Ended
          </h1>
          <div className="absolute top-4 right-4">
            <LeaveRoomButton send={send} />
          </div>

          {roundResults && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Final Round Answers
              </h2>
              <div className="space-y-2">
                {roundResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 border-2 ${
                      result.isValid && !result.isDuplicate
                        ? "bg-brand-cyan/30 border-[var(--foreground)]"
                        : result.isDuplicate
                        ? "bg-brand-pink/30 border-[var(--foreground)]"
                        : "bg-background border-[var(--foreground)]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">
                          {result.playerName}
                        </span>
                        <span className="ml-2">
                          {result.answer}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {result.isDuplicate && (
                          <span className="text-sm">
                            Duplicate
                          </span>
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

          {correctAnswers && correctAnswers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                All Valid Answers
              </h2>
              <div className="flex flex-wrap gap-2">
                {correctAnswers.map((answer, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-background border border-[var(--foreground)] text-sm"
                  >
                    {answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Final Scores
            </h2>
            <PlayerList
              players={[...players].sort((a, b) => b.score - a.score)}
            />
          </div>

          {isCurrentPlayerHost && (
            <div>
              {onePlayerRemaining ? (
                <Button
                  onClick={handleStartNewLobby}
                  variant={ButtonVariant.YELLOW}
                  className="w-full mt-6 py-3"
                >
                  Start New Lobby
                </Button>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    Settings
                  </h2>
                  <RoomSettingsPanel
                    settings={settings}
                    onChange={setSettings}
                  />
                  <Button
                    onClick={handleNewGame}
                    variant={ButtonVariant.YELLOW}
                    className="w-full mt-6 py-3"
                  >
                    New Game
                  </Button>
                </div>
              )}
            </div>
          )}

          {!isCurrentPlayerHost && (
            <p className="text-center">
              Waiting for host to start new game...
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
