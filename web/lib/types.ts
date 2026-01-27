// Shared types - duplicated from game/src/types.ts for client use
// Game states
export type GameState =
  | "LOBBY"
  | "FETCH_ROUND"
  | "COUNTDOWN"
  | "PLAYING"
  | "PROCESSING"
  | "SCOREBOARD";

// Player object
export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isBot: boolean;
  currentAnswer?: string;
  hasSubmitted: boolean;
}

// Room settings
export interface RoomSettings {
  botEnabled: boolean;
  botDifficulty: "easy" | "medium" | "chaos";
  theme: string | null;
  speedMultiplier: number; // 0.5 - 2.0
}

// Database types
export interface Theme {
  id: number;
  slug: string;
  display_name: string;
}

export interface Question {
  id: string;
  prompt: string;
  theme_slug: string;
  difficulty: number;
  answer_count_cache: number;
}

export interface Answer {
  id: string;
  question_id: string;
  display_text: string;
  variants: string[];
  popularity_rank: number;
}

// Round result
export interface RoundResult {
  playerId: string;
  playerName: string;
  answer: string;
  isValid: boolean;
  isDuplicate: boolean;
  points: number;
}

// Client -> Server messages
export type ClientMessage =
  | { type: "JOIN_ROOM"; name: string; avatar: string; isPublic?: boolean }
  | { type: "START_GAME"; settings: RoomSettings }
  | { type: "SUBMIT"; answer: string }
  | { type: "NEXT_ROUND" };

// Server -> Client messages
export type ServerMessage =
  | {
      type: "SYNC";
      state: GameState;
      players: Player[];
      timer: number;
      question?: Question;
      round: number;
    }
  | { type: "PLAYER_UPDATE"; players: Player[] }
  | { type: "TICK"; time: number }
  | { type: "ROUND_START"; question: Question; answerCount: number }
  | { type: "ROUND_END"; results: RoundResult[]; correctAnswers: string[] }
  | { type: "ERROR"; message: string };
