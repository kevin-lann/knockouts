"use client"

import { useGameStore } from "@/lib/store"
import {
  ClientMessageType,
  GameState,
  MIN_BOT_COUNT,
  type ClientMessage,
} from "@shared/types"
import PlayerList from "./PlayerList"
import RoomSettingsPanel from "./RoomSettingsPanel"
import { toast } from "react-hot-toast"
import LeaveRoomButton from "../room/LeaveRoomButton"
import { useRoomSettings } from "@/hooks/useRoomSettings"
import Button, { ButtonVariant } from "../general/Button"
import Card from "../general/Card"
import CopyRoomLinkButton from "../general/CopyRoomLinkButton"
import { HEADER_FONT } from "@/app/constants/font"

interface LobbyViewProps {
  roomId: string
  send: (message: ClientMessage) => void
}

export default function LobbyView({ roomId, send }: LobbyViewProps) {
  const { players, playerId, gameState } = useGameStore()
  const { settings, setSettings } = useRoomSettings()
  const isCurrentPlayerHost = players.find((p) => p.id === playerId)?.isHost
  const isWaitingForFirstQuestion = gameState === GameState.FETCH_ROUND

  // Ensure players is always an array
  const playersArray = Array.isArray(players) ? players : []
  const humanPlayerCount = playersArray.filter((player) => !player.isBot).length
  const configuredBotCount = settings.botEnabled
    ? Math.max(MIN_BOT_COUNT, settings.botCount)
    : 0
  const totalContenderCount = humanPlayerCount + configuredBotCount
  const canStartGame = totalContenderCount >= 2 && !isWaitingForFirstQuestion

  const handleStartGame = () => {
    if (totalContenderCount < 2) {
      toast.error("Need at least 2 players to start")
      return
    }
    send({ type: ClientMessageType.START_GAME, settings })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${HEADER_FONT.className}`}>
              Room: {roomId}
            </h1>
            <div className="flex gap-2">
              <CopyRoomLinkButton roomId={roomId} />
              <LeaveRoomButton send={send} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Players</h2>
              <PlayerList players={playersArray} />
              {totalContenderCount < 2 && (
                <p className="mt-4">
                  Waiting for more players... ({totalContenderCount}/2+)
                </p>
              )}
            </div>

            {isCurrentPlayerHost && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Settings</h2>
                <RoomSettingsPanel settings={settings} onChange={setSettings} />
                <Button
                  onClick={handleStartGame}
                  disabled={!canStartGame}
                  variant={ButtonVariant.YELLOW}
                  className="w-full mt-6 py-3"
                >
                  {isWaitingForFirstQuestion ? "Starting Game..." : "Start Game"}
                </Button>
              </div>
            )}

            {!isCurrentPlayerHost && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Waiting for host to start...
                </h2>
                <p>The host will start the game when ready.</p>
              </div>
            )}
          </div>

          {isWaitingForFirstQuestion && (
            <div className="mt-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--foreground)] mx-auto mb-4"></div>
              <p className="text-lg">Starting...</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
