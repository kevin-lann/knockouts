"use client"

import { useGameStore } from "@/lib/store"
import { ClientMessageType, type ClientMessage } from "@shared/types"
import PlayerList from "./PlayerList"
import RoomSettingsPanel from "./RoomSettingsPanel"
import { toast } from "react-hot-toast"
import LeaveRoomButton from "../room/LeaveRoomButton"
import { useRoomSettings } from "@/hooks/useRoomSettings"
import Button, { ButtonVariant } from "../general/Button"
import Card from "../general/Card"
import CopyRoomLinkButton from "../general/CopyRoomLinkButton"

interface LobbyViewProps {
  roomId: string
  send: (message: ClientMessage) => void
}

export default function LobbyView({ roomId, send }: LobbyViewProps) {
  const { players, playerId } = useGameStore()
  const { settings, setSettings } = useRoomSettings()
  const isCurrentPlayerHost = players.find((p) => p.id === playerId)?.isHost

  // Ensure players is always an array
  const playersArray = Array.isArray(players) ? players : []

  const handleStartGame = () => {
    if (playersArray.length < 2) {
      toast.error("Need at least 2 players to start")
      return
    }
    send({ type: ClientMessageType.START_GAME, settings })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Room: {roomId}</h1>
            <div className="flex gap-2">
              <CopyRoomLinkButton roomId={roomId} />
              <LeaveRoomButton send={send} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Players</h2>
              <PlayerList players={playersArray} />
              {playersArray.length < 2 && (
                <p className="mt-4">
                  Waiting for more players... ({playersArray.length}/2+)
                </p>
              )}
              {/* Debug info */}
              {process.env.NODE_ENV === "development" && (
                <p className="text-xs mt-2">
                  Debug: players array length = {playersArray.length}, type ={" "}
                  {typeof playersArray.length}, isArray ={" "}
                  {Array.isArray(players).toString()}
                </p>
              )}
            </div>

            {isCurrentPlayerHost && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Settings
                </h2>
                <RoomSettingsPanel settings={settings} onChange={setSettings} />
                <Button
                  onClick={handleStartGame}
                  disabled={playersArray.length < 2}
                  variant={ButtonVariant.YELLOW}
                  className="w-full mt-6 py-3"
                >
                  Start Game
                </Button>
              </div>
            )}

            {!isCurrentPlayerHost && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Waiting for host to start...
                </h2>
                <p>
                  The host will start the game when ready.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
