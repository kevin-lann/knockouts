"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useParams } from "next/navigation"
import { usePartySocket } from "@/hooks/usePartySocket"
import { useGameStore } from "@/lib/store"
import LobbyView from "@/components/lobby/LobbyView"
import GameView from "@/components/game/GameView"
import ScoreboardView from "@/components/scoreboard/ScoreboardView"
import CountdownOverlay from "@/components/game/CountdownOverlay"
import ProcessingView from "@/components/game/ProcessingView"
import GameEndView from "@/components/game/GameEndView"
import JoinRoomForm from "@/components/room/JoinRoomForm"
import { ClientMessageType, GameState } from "@shared/types"
import {
  getStoredPlayerProfile,
  setStoredPlayerProfile,
  type PlayerProfile,
} from "@/lib/playerProfile"

const CLIENT_ID_STORAGE_KEY = "knockouts-client-id"

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [joinedProfile, setJoinedProfile] = useState<PlayerProfile | null>(null)
  // use this as a hack to ensure the component is hydrated
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  // only when component is hydrated we should access session storage. This is to
  // avoid SSCR/CSR hydration issues since session storage differs between server and client.
  const storedProfile = useMemo(() => {
    if (!hydrated) {
      return null
    }
    return getStoredPlayerProfile()
  }, [hydrated])

  const profile = joinedProfile ?? storedProfile

  // Same here, only when component is hydrated we should access session storage.
  const clientId = useMemo(() => {
    if (!hydrated) {
      return null
    }

    const existingClientId = window.sessionStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existingClientId) {
      return existingClientId
    }

    const newClientId = crypto.randomUUID()
    window.sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, newClientId)
    return newClientId
  }, [hydrated])

  const { send } = usePartySocket(roomId)
  const { gameState, setRoomId, connected, playerId } = useGameStore()
  const joinedConnectionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (profile) {
      setRoomId(roomId)
    }
  }, [profile, roomId, setRoomId])

  useEffect(() => {
    if (!connected || !playerId || !profile || !send || !clientId) {
      return
    }

    // Re-join when socket connection changes (e.g. dev Strict Mode remounts/reconnects)
    if (joinedConnectionIdRef.current === playerId) {
      return
    }

    const sendJoin = async () => {
      try {
        const response = await fetch("/api/join-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId,
            clientId,
            name: profile.name,
            avatarId: profile.avatarId,
          }),
        })

        if (!response.ok) {
          console.error("Failed to fetch join token")
          return
        }

        const data = (await response.json()) as { joinToken?: string }
        if (!data.joinToken) {
          console.error("Join token missing in response")
          return
        }

        send({
          type: ClientMessageType.JOIN_ROOM,
          clientId,
          joinToken: data.joinToken,
        })
        joinedConnectionIdRef.current = playerId
      } catch (error) {
        console.error("Failed to join room:", error)
      }
    }

    void sendJoin()
  }, [connected, playerId, profile, send, clientId, roomId])

  const handleJoin = (nextProfile: PlayerProfile) => {
    setStoredPlayerProfile(nextProfile)
    setJoinedProfile(nextProfile)
  }

  if (!hydrated) {
    return <div className="min-h-screen" />
  }

  // Show join form if no stored profile is available
  if (!profile) {
    return <JoinRoomForm roomId={roomId} initialProfile={null} onJoin={handleJoin} />
  }

  return (
    <div className="min-h-screen">
      {gameState === GameState.LOBBY && (
        <LobbyView roomId={roomId} send={send} />
      )}
      {gameState === GameState.COUNTDOWN && <CountdownOverlay />}
      {gameState === GameState.PLAYING && <GameView roomId={roomId} send={send} />}
      {gameState === GameState.PROCESSING && <ProcessingView />}
      {gameState === GameState.SCOREBOARD && (
        <ScoreboardView roomId={roomId} send={send} />
      )}
      {gameState === GameState.GAME_ENDED && (
        <GameEndView roomId={roomId} send={send} />
      )}
    </div>
  )
}
