"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { usePartySocket } from "@/hooks/usePartySocket"
import { useGameStore } from "@/lib/store"
import LobbyView from "@/components/lobby/LobbyView"
import GameView from "@/components/game/GameView"
import ScoreboardView from "@/components/scoreboard/ScoreboardView"
import CountdownOverlay from "@/components/game/CountdownOverlay"
import ProcessingView from "@/components/game/ProcessingView"
import JoinRoomForm from "@/components/room/JoinRoomForm"
import { ClientMessageType, GameState } from "@/lib/types"

const CLIENT_ID_STORAGE_KEY = "knockouts-client-id"

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string
  const name = searchParams.get("name")
  const avatar = searchParams.get("avatar")
  // If private=true is present, it's a private room
  // Otherwise, it's a public room (found via registry or newly created)
  const isPublic = searchParams.get("private") !== "true"
  const [clientId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null
    }

    const existingClientId = window.sessionStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existingClientId) {
      return existingClientId
    }

    const newClientId = crypto.randomUUID()
    window.sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, newClientId)
    return newClientId
  })

  const { send } = usePartySocket(roomId)
  const { gameState, setRoomId, connected, playerId } = useGameStore()
  const joinedConnectionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (name && avatar) {
      setRoomId(roomId)
    }
  }, [name, avatar, roomId, setRoomId])

  useEffect(() => {
    if (!connected || !playerId || !name || !avatar || !send || !clientId) {
      return
    }

    // Re-join when socket connection changes (e.g. dev Strict Mode remounts/reconnects)
    if (joinedConnectionIdRef.current === playerId) {
      return
    }

    console.log("Sending JOIN_ROOM:", { name, avatar, isPublic })
    send({
      type: ClientMessageType.JOIN_ROOM,
      name,
      avatar,
      clientId,
      isPublic,
    })
    joinedConnectionIdRef.current = playerId
  }, [connected, playerId, name, avatar, send, isPublic, clientId])

  // Show join form if name/avatar not provided
  if (!name || !avatar) {
    return <JoinRoomForm roomId={roomId} />
  }

  return (
    <div className="min-h-screen">
      {gameState === GameState.LOBBY && (
        <LobbyView roomId={roomId} send={send} />
      )}
      {gameState === GameState.COUNTDOWN && <CountdownOverlay />}
      {gameState === GameState.PLAYING && <GameView send={send} />}
      {gameState === GameState.PROCESSING && <ProcessingView />}
      {gameState === GameState.SCOREBOARD && (
        <ScoreboardView roomId={roomId} send={send} />
      )}
    </div>
  )
}
