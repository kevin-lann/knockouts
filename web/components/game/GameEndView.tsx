"use client"

import { useGameStore } from "@/lib/store"
import { ClientMessageType, type ClientMessage } from "@shared/types"
import PlayerList from "../lobby/PlayerList"
import LeaveRoomButton from "../room/LeaveRoomButton"
import RoomSettingsPanel from "../lobby/RoomSettingsPanel"
import { useRoomSettings } from "@/hooks/useRoomSettings"

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

  const handleNewGame = () => {
    send({ type: ClientMessageType.START_GAME, settings })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 relative">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Game Ended
          </h1>
          <div className="absolute top-4 right-4">
            <LeaveRoomButton send={send} />
          </div>

          {roundResults && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                Final Round Answers
              </h2>
              <div className="space-y-2">
                {roundResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      result.isValid && !result.isDuplicate
                        ? "bg-green-500/20 border-2 border-green-500"
                        : result.isDuplicate
                        ? "bg-red-500/20 border-2 border-red-500"
                        : "bg-gray-500/20 border-2 border-gray-500"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-white font-semibold">
                          {result.playerName}
                        </span>
                        <span className="text-white/70 ml-2">
                          {result.answer}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {result.isDuplicate && (
                          <span className="text-red-300 text-sm">
                            Duplicate
                          </span>
                        )}
                        {!result.isValid && (
                          <span className="text-gray-300 text-sm">Wrong</span>
                        )}
                        {result.isValid && !result.isDuplicate && (
                          <span className="text-green-300 text-sm font-bold">
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
              <h2 className="text-xl font-semibold text-white mb-4">
                All Valid Answers
              </h2>
              <div className="flex flex-wrap gap-2">
                {correctAnswers.map((answer, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm"
                  >
                    {answer}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Final Scores
            </h2>
            <PlayerList players={[...players].sort((a, b) => b.score - a.score)} />
          </div>

          {isCurrentPlayerHost && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
              <RoomSettingsPanel settings={settings} onChange={setSettings} />
              <button
                onClick={handleNewGame}
                className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                New Game
              </button>
            </div>
          )}

          {!isCurrentPlayerHost && (
            <p className="text-white/70 text-center">
              Waiting for host to start new game...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
