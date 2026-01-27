"use client";

import { useEffect, useRef, useCallback } from "react";
import PartySocket from "partysocket";
import { useGameStore } from "@/lib/store";
import type { ClientMessage } from "@/lib/types";

// PARTYKIT_HOST will be injected at build time or runtime
declare global {
  const PARTYKIT_HOST: string;
}

export function usePartySocket(roomId: string | null) {
  const socketRef = useRef<PartySocket | null>(null);
  const pendingMessagesRef = useRef<ClientMessage[]>([]);
  const { setConnected, handleServerMessage, setPlayerId } = useGameStore();

  useEffect(() => {
    if (!roomId) return;

    const host =
      typeof PARTYKIT_HOST !== "undefined"
        ? PARTYKIT_HOST
        : process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";
    const socket = new PartySocket({
      host,
      room: roomId,
    });

    socketRef.current = socket;

    const sendPendingMessages = () => {
      const pendingCount = pendingMessagesRef.current.length;
      console.log(`sendPendingMessages called, ${pendingCount} pending messages`);
      const currentSocket = socketRef.current;
      if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
        console.warn("Cannot send pending messages - socket not ready:", currentSocket?.readyState);
        return;
      }
      
      // Copy the pending messages array before clearing it
      const messagesToSend = [...pendingMessagesRef.current];
      pendingMessagesRef.current = [];
      
      console.log(`Sending ${messagesToSend.length} pending messages`);
      for (const message of messagesToSend) {
        console.log("Sending pending message:", message.type, message);
        currentSocket.send(JSON.stringify(message));
      }
    };

    socket.addEventListener("open", () => {
      console.log("Connected to room:", roomId, "socket.id:", socket.id);
      setConnected(true);
      setPlayerId(socket.id);
      // Send pending messages immediately when socket opens
      sendPendingMessages();
    });

    socket.addEventListener("close", () => {
      console.log("Disconnected from room");
      setConnected(false);
    });

    socket.addEventListener("error", (error) => {
      console.error("Socket error:", error);
      setConnected(false);
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data as string);
        console.log("Received message:", message.type, message);
        handleServerMessage(message);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
      // Clear pending messages when cleaning up (room is changing)
      pendingMessagesRef.current = [];
    };
  }, [roomId, setConnected, handleServerMessage, setPlayerId]);

  const send = useCallback(
    (message: ClientMessage) => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        console.log("Sending message:", message.type, message);
        socket.send(JSON.stringify(message));
      } else {
        console.warn("Socket not ready, readyState:", socket?.readyState, "- queuing message", message.type);
        // Queue message to be sent when socket opens
        pendingMessagesRef.current.push(message);
        console.log(`Queued message. Total pending: ${pendingMessagesRef.current.length}`);
      }
    },
    []
  );

  return { send };
}
