"use client"

import { useGameStore } from "@/lib/store"
import { ClientMessageType,
type ClientMessage } from "@/lib/types"
import Timer from "./Timer"
import AnswerInput from "./AnswerInput"
import PlayerList from "../lobby/PlayerList"
import LeaveRoomButton from "../room/LeaveRoomButton"

interface GameViewProps {
  send: (message: ClientMessage) => void;
}

export default function GameView({ send }: GameViewProps) {
  const { question, timer, players, currentInput, hasSubmitted, setInput } =
    useGameStore()

  const handleSubmit = () => {
    if (!currentInput.trim() || hasSubmitted) return
    send({ type: ClientMessageType.SUBMIT, answer: currentInput.trim() })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 relative">
          <div className="text-center mb-8">
            <Timer time={timer} />
          </div>
          <div>
            <div className="absolute top-4 right-4">
              <LeaveRoomButton send={send} />
            </div>
          </div>

          {question && (
            <div className="mb-8">
              <div className="bg-white/20 rounded-lg p-6 mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {question.prompt}
                </h2>
                <p className="text-white/70">
                  {question.answer_count_cache} possible answers
                </p>
              </div>

              <AnswerInput
                value={currentInput}
                onChange={setInput}
                onSubmit={handleSubmit}
                disabled={hasSubmitted}
                submitted={hasSubmitted}
              />
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Players ({players.filter((p) => p.hasSubmitted).length}/
              {players.filter((p) => !p.isBot).length} submitted)
            </h3>
            <PlayerList players={players} />
          </div>
        </div>
      </div>
    </div>
  )
}
