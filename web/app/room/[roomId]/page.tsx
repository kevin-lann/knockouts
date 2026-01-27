"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePartySocket } from "@/hooks/usePartySocket";
import { useGameStore } from "@/lib/store";
import LobbyView from "@/components/lobby/LobbyView";
import GameView from "@/components/game/GameView";
import ScoreboardView from "@/components/scoreboard/ScoreboardView";
import CountdownOverlay from "@/components/game/CountdownOverlay";
import ProcessingView from "@/components/game/ProcessingView";
import JoinRoomForm from "@/components/room/JoinRoomForm";

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const name = searchParams.get("name");
  const avatar = searchParams.get("avatar");
  const isHost = searchParams.get("host") === "true";
  // If private=true is present, it's a private room
  // Otherwise, it's a public room (found via registry or newly created)
  const isPublic = searchParams.get("private") !== "true";

  const { send } = usePartySocket(roomId);
  const { gameState, setRoomId } = useGameStore();
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (name && avatar) {
      setRoomId(roomId);
    }
  }, [name, avatar, roomId, setRoomId]);

  useEffect(() => {
    if (!hasJoinedRef.current && name && avatar && send) {
      console.log("Sending JOIN_ROOM:", { name, avatar, isPublic });
      send({
        type: "JOIN_ROOM",
        name,
        avatar,
        isPublic,
      });
      hasJoinedRef.current = true;
    }
  }, [name, avatar, send, isPublic]);

  // Show join form if name/avatar not provided
  if (!name || !avatar) {
    return <JoinRoomForm roomId={roomId} />;
  }

  return (
    <div className="min-h-screen">
      {gameState === "LOBBY" && (
        <LobbyView roomId={roomId} isHost={isHost} send={send} />
      )}
      {gameState === "COUNTDOWN" && <CountdownOverlay />}
      {gameState === "PLAYING" && <GameView send={send} />}
      {gameState === "PROCESSING" && <ProcessingView />}
      {gameState === "SCOREBOARD" && (
        <ScoreboardView roomId={roomId} isHost={isHost} send={send} />
      )}
    </div>
  );
}
