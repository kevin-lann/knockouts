"use client";

import { create } from "zustand";
import type {
  GameState,
  Player,
  Question,
  RoundResult,
  ServerMessage,
} from "./types";
import { DEFAULT_ROUND_DURATION } from "@/app/constants/magic-numbers";

interface GameStore {
  // Connection state
  connected: boolean;
  roomId: string | null;
  playerId: string | null;

  // Game state (from server SYNC)
  gameState: GameState;
  players: Player[];
  timer: number;
  round: number;
  question: Question | null;
  answerCount: number;

  // Round results
  roundResults: RoundResult[] | null;
  correctAnswers: string[] | null;

  // Local UI state
  currentInput: string;
  hasSubmitted: boolean;

  // Actions
  setConnected: (connected: boolean) => void;
  setRoomId: (roomId: string) => void;
  setPlayerId: (playerId: string) => void;
  setInput: (input: string) => void;
  setSubmitted: (submitted: boolean) => void;
  handleServerMessage: (msg: ServerMessage) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  roomId: null,
  playerId: null,
  gameState: "LOBBY" as GameState,
  players: [],
  timer: 0,
  round: 0,
  question: null,
  answerCount: 0,
  roundResults: null,
  correctAnswers: null,
  currentInput: "",
  hasSubmitted: false,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  setRoomId: (roomId) => set({ roomId }),
  setPlayerId: (playerId) => set({ playerId }),
  setInput: (input) => set({ currentInput: input }),
  setSubmitted: (submitted) => set({ hasSubmitted: submitted }),

  handleServerMessage: (msg) => {
    switch (msg.type) {
      case "SYNC":
        console.log("SYNC received:", msg.players?.length, "players");
        set({
          gameState: msg.state,
          players: msg.players,
          timer: msg.timer,
          question: msg.question || null,
          round: msg.round,
        });
        break;
      case "PLAYER_UPDATE":
        console.log("PLAYER_UPDATE received:", msg.players?.length, "players", msg.players);
        if (!Array.isArray(msg.players)) {
          console.error("PLAYER_UPDATE: players is not an array:", msg.players);
          break;
        }
        set({ players: msg.players });
        // Update hasSubmitted based on current player
        const currentPlayer = msg.players.find((p) => p.id === useGameStore.getState().playerId);
        if (currentPlayer) {
          set({ hasSubmitted: currentPlayer.hasSubmitted });
        }
        break;
      case "TICK":
        set({ timer: msg.time });
        break;
      case "ROUND_START":
        set({
          gameState: "PLAYING",
          question: msg.question,
          answerCount: msg.answerCount,
          timer: DEFAULT_ROUND_DURATION,
          hasSubmitted: false,
          currentInput: "",
          roundResults: null,
          correctAnswers: null,
        });
        break;
      case "ROUND_END":
        set({
          gameState: "SCOREBOARD",
          roundResults: msg.results,
          correctAnswers: msg.correctAnswers,
        });
        break;
      case "ERROR":
        console.error("Server error:", msg.message);
        break;
    }
  },

  reset: () => set(initialState),
}));
