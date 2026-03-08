"use client"

import { useGameStore } from "@/lib/store"
import { ClientMessageType, type ClientMessage } from "@shared/types"
import Timer from "./Timer"
import AnswerInput from "./AnswerInput"
import PlayerList from "../lobby/PlayerList"
import LeaveRoomButton from "../room/LeaveRoomButton"
import Card from "../general/Card"
import CopyRoomLinkButton from "../general/CopyRoomLinkButton"

interface GameViewProps {
  roomId: string
  send: (message: ClientMessage) => void
}

export default function GameView({ roomId, send }: GameViewProps) {
  const {
    question,
    timer,
    players,
    currentInput,
    hasSubmitted,
    setInput,
    playerId,
  } = useGameStore()

  const handleSubmit = () => {
    if (!currentInput.trim() || hasSubmitted) return
    send({ type: ClientMessageType.SUBMIT, answer: currentInput.trim() })
  }

  const isEliminated =
    players.find((p) => p.id === playerId)?.isEliminated ?? false

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 relative">
          <div className="text-center mb-8">
            <Timer time={timer} />
          </div>
          <div>
            <div className="absolute top-4 right-4 flex gap-2">
              <CopyRoomLinkButton roomId={roomId} />
              <LeaveRoomButton send={send} />
            </div>
          </div>

          {question && (
            <div className="mb-8">
              <div className="bg-background border-2 border-black p-6 mb-4">
                <h2 className="text-2xl font-bold mb-2">{question.prompt}</h2>
                <p>{question.answer_count_cache} possible answers</p>
              </div>

              <AnswerInput
                value={currentInput}
                onChange={setInput}
                onSubmit={handleSubmit}
                disabled={isEliminated}
                submitted={hasSubmitted}
                isEliminated={isEliminated}
              />
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">
              Players ({players.filter((p) => p.hasSubmitted).length}/
              {players.filter((p) => !p.isBot).length} submitted)
            </h3>
            <PlayerList players={players} />
          </div>
        </Card>
      </div>
    </div>
  )
}
