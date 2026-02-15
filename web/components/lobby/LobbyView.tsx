"use client"

import { useState } from "react"
import { useGameStore } from "@/lib/store"
import {
  BotDifficulty,
  ClientMessageType,
  type ClientMessage,
  type RoomSettings,
} from "@/lib/types"
import PlayerList from "./PlayerList"
import RoomSettingsPanel from "./RoomSettingsPanel"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

interface LobbyViewProps {
  roomId: string
  send: (message: ClientMessage) => void
}

export default function LobbyView({ roomId, send }: LobbyViewProps) {
  const router = useRouter()
  const { players, playerId } = useGameStore()
  const isCurrentPlayerHost = players.find((p) => p.id === playerId)?.isHost
  const [settings, setSettings] = useState<RoomSettings>({
    botEnabled: true,
    botDifficulty: BotDifficulty.MEDIUM,
    theme: null,
    speedMultiplier: 1.0,
  })

  // Ensure players is always an array
  const playersArray = Array.isArray(players) ? players : []

  const handleStartGame = () => {
    if (playersArray.length < 2) {
      toast.error("Need at least 2 players to start")
      return
    }
    send({ type: ClientMessageType.START_GAME, settings })
  }

  const handleLeaveRoom = () => {
    send({ type: ClientMessageType.LEAVE_ROOM })
    router.push("/")
  }

  const copyRoomLink = () => {
    const url = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(url)
    toast.success("Room link copied!")
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Room: {roomId}</h1>
            <div className="flex gap-2">
              <button
                onClick={copyRoomLink}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all cursor-pointer"
              >
                Copy Link
              </button>
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-all cursor-pointer"
              >
                Leave Room
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Players</h2>
              <PlayerList players={playersArray} />
              {playersArray.length < 2 && (
                <p className="text-white/70 mt-4">
                  Waiting for more players... ({playersArray.length}/2+)
                </p>
              )}
              {/* Debug info */}
              {process.env.NODE_ENV === "development" && (
                <p className="text-xs text-white/50 mt-2">
                  Debug: players array length = {playersArray.length}, type ={" "}
                  {typeof playersArray.length}, isArray ={" "}
                  {Array.isArray(players).toString()}
                </p>
              )}
            </div>

            {isCurrentPlayerHost && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Settings
                </h2>
                <RoomSettingsPanel settings={settings} onChange={setSettings} />
                <button
                  onClick={handleStartGame}
                  disabled={playersArray.length < 2}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Start Game
                </button>
              </div>
            )}

            {!isCurrentPlayerHost && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Waiting for host to start...
                </h2>
                <p className="text-white/70">
                  The host will start the game when ready.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
