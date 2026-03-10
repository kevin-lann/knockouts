export enum GameState {
  LOBBY = "LOBBY",
  FETCH_ROUND = "FETCH_ROUND",
  COUNTDOWN = "COUNTDOWN",
  PLAYING = "PLAYING",
  PROCESSING = "PROCESSING",
  SCOREBOARD = "SCOREBOARD",
  GAME_ENDED = "GAME_ENDED",
}

export interface Player {
  id: string
  name: string
  avatarId: AvatarId
  avatarImagePath: string
  score: number
  isHost: boolean
  isBot: boolean
  isEliminated: boolean
  hasHighestScore: boolean
  currentAnswer?: string
  hasSubmitted: boolean
}

export enum BotDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  CHAOS = "chaos",
}

export enum AvatarId {
  GRIN = "GRIN",
  COOL = "COOL",
  NERD = "NERD",
  SMILE = "SMILE",
  PARTY = "PARTY",
  ROBOT = "ROBOT",
  ALIEN = "ALIEN",
  GAMEPAD = "GAMEPAD",
}

export interface AvatarOption {
  id: AvatarId
  imagePath: string
  fallback: string
  alt: string
}

export const AVATAR_OPTIONS: ReadonlyArray<AvatarOption> = [
  {
    id: AvatarId.GRIN,
    imagePath: "/avatars/grin.png",
    fallback: "😀",
    alt: "Grinning avatar",
  },
  {
    id: AvatarId.COOL,
    imagePath: "/avatars/cool.png",
    fallback: "😎",
    alt: "Cool avatar",
  },
  {
    id: AvatarId.NERD,
    imagePath: "/avatars/nerd.png",
    fallback: "🤓",
    alt: "Nerd avatar",
  },
  {
    id: AvatarId.SMILE,
    imagePath: "/avatars/smile.png",
    fallback: "😊",
    alt: "Smiling avatar",
  },
  {
    id: AvatarId.PARTY,
    imagePath: "/avatars/party.png",
    fallback: "🥳",
    alt: "Party avatar",
  },
  {
    id: AvatarId.ROBOT,
    imagePath: "/avatars/robot.png",
    fallback: "🤖",
    alt: "Robot avatar",
  },
  {
    id: AvatarId.ALIEN,
    imagePath: "/avatars/alien.png",
    fallback: "👾",
    alt: "Alien avatar",
  },
  {
    id: AvatarId.GAMEPAD,
    imagePath: "/avatars/gamepad.png",
    fallback: "🎮",
    alt: "Gamepad avatar",
  },
]

export const DEFAULT_AVATAR_ID = AvatarId.GRIN

export enum IconId {
  CROWN = "CROWN",
  ERROR = "ERROR",
}

export const DEFAULT_MAX_ROUNDS = 50
export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 200

export interface RoomSettings {
  botEnabled: boolean
  botDifficulty: BotDifficulty
  theme: string | null
  speedMultiplier: number
  maxRounds: number
}

export interface Theme {
  id: number
  slug: string
  display_name: string
}

export interface Question {
  id: string
  prompt: string
  theme_slug: string
  difficulty: number
  answer_count_cache: number
}

export interface Answer {
  id: string
  question_id: string
  display_text: string
  variants: string[]
  popularity_rank: number
}

export interface RoundResult {
  playerId: string
  playerName: string
  answer: string
  isValid: boolean
  isDuplicate: boolean
  points: number
}

export enum ClientMessageType {
  JOIN_ROOM = "JOIN_ROOM",
  LEAVE_ROOM = "LEAVE_ROOM",
  START_GAME = "START_GAME",
  SUBMIT = "SUBMIT",
  NEXT_ROUND = "NEXT_ROUND",
  START_NEW_LOBBY = "START_NEW_LOBBY",
}

export enum ServerMessageType {
  SYNC = "SYNC",
  PLAYER_UPDATE = "PLAYER_UPDATE",
  TICK = "TICK",
  ROUND_START = "ROUND_START",
  ROUND_END = "ROUND_END",
  ERROR = "ERROR",
  GAME_ENDED = "GAME_ENDED",
}

export type ClientMessage =
  | {
      type: ClientMessageType.JOIN_ROOM
      clientId: string
      joinToken: string
    }
  | { type: ClientMessageType.LEAVE_ROOM }
  | { type: ClientMessageType.START_GAME, settings: RoomSettings }
  | { type: ClientMessageType.SUBMIT, answer: string }
  | { type: ClientMessageType.NEXT_ROUND }
  | { type: ClientMessageType.START_NEW_LOBBY }

export type ServerMessage =
  | {
      type: ServerMessageType.SYNC
      state: GameState
      players: Player[]
      timer: number
      question?: Question
      round: number
      settings: RoomSettings
    }
  | { type: ServerMessageType.PLAYER_UPDATE, players: Player[] }
  | { type: ServerMessageType.TICK, time: number }
  | {
      type: ServerMessageType.ROUND_START
      question: Question
      answerCount: number
      round: number
    }
  | {
      type: ServerMessageType.ROUND_END
      results: RoundResult[]
      correctAnswers: string[]
      round: number
    }
  | { type: ServerMessageType.ERROR, message: string }
  | {
      type: ServerMessageType.GAME_ENDED
      results: RoundResult[]
      correctAnswers: string[]
      round: number
    }
