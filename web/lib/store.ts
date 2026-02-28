"use client"

import { create } from "zustand"
import {
  ServerMessageType,
  GameState,
  type Player,
  type Question,
  type RoomSettings,
  type RoundResult,
  type ServerMessage,
} from "@shared/types"
import { DEFAULT_ROUND_DURATION } from "@/app/constants/magic-numbers"
import { DEFAULT_SETTINGS } from "@/app/constants/settings"

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
  roomSettings: RoomSettings;

  // Actions
  setConnected: (connected: boolean) => void;
  setRoomId: (roomId: string) => void;
  setPlayerId: (playerId: string) => void;
  setInput: (input: string) => void;
  setSubmitted: (submitted: boolean) => void;
  setRoomSettings: (settings: RoomSettings) => void;
  resetRoomSettings: () => void;
  handleServerMessage: (msg: ServerMessage) => void;
  reset: () => void;
}

const cloneDefaultSettings = (): RoomSettings => ({ ...DEFAULT_SETTINGS })

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
  roomSettings: cloneDefaultSettings(),
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  setRoomId: (roomId) =>
    set((state) => {
      if (state.roomId === roomId) {
        return { roomId }
      }
      return {
        roomId,
        roomSettings: cloneDefaultSettings(),
      }
    }),
  setPlayerId: (playerId) => set({ playerId }),
  setInput: (input) => set({ currentInput: input }),
  setSubmitted: (submitted) => set({ hasSubmitted: submitted }),
  setRoomSettings: (settings) => set({ roomSettings: settings }),
  resetRoomSettings: () => set({ roomSettings: cloneDefaultSettings() }),

  handleServerMessage: (msg) => {
    switch (msg.type) {
      case ServerMessageType.SYNC:
        console.log("SYNC received:", msg.players?.length, "players")
        set({
          gameState: msg.state,
          players: msg.players,
          timer: msg.timer,
          question: msg.question || null,
          round: msg.round,
        })
        break
      case ServerMessageType.PLAYER_UPDATE:
        console.log("PLAYER_UPDATE received:", msg.players?.length, "players", msg.players)
        if (!Array.isArray(msg.players)) {
          console.error("PLAYER_UPDATE: players is not an array:", msg.players)
          break
        }
        set({ players: msg.players })
        // Update hasSubmitted based on current player
        const currentPlayer = msg.players.find((p) => p.id === useGameStore.getState().playerId)
        if (currentPlayer) {
          set({ hasSubmitted: currentPlayer.hasSubmitted })
        }
        break
      case ServerMessageType.TICK:
        set({ timer: msg.time })
        break
      case ServerMessageType.ROUND_START:
        set({
          gameState: GameState.PLAYING,
          question: msg.question,
          answerCount: msg.answerCount,
          timer: DEFAULT_ROUND_DURATION,
          hasSubmitted: false,
          currentInput: "",
          roundResults: null,
          correctAnswers: null,
        })
        break
      case ServerMessageType.ROUND_END:
        set({
          gameState: GameState.SCOREBOARD,
          roundResults: msg.results,
          correctAnswers: msg.correctAnswers,
        })
        break
      case ServerMessageType.GAME_ENDED:
        set({
          gameState: GameState.GAME_ENDED,
          roundResults: msg.results,
          correctAnswers: msg.correctAnswers,
        })
        break
      case ServerMessageType.ERROR:
        console.error("Server error:", msg.message)
        break
    }
  },

  reset: () => set(initialState),
}))
