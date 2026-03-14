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
  AVACADO = "AVACADO",
  COLD = "COLD",
  HOT = "HOT",
  HUSH = "HUSH",
  LAUGH = "LAUGH",
  MONSTER = "MONSTER",
  NERD = "NERD",
  PANDA = "PANDA",
  SKULL = "SKULL",
  SQUIDWARD = "SQUIDWARD",
}

export interface AvatarOption {
  id: AvatarId
  imagePath: string
  fallback: string
  alt: string
}

export const AVATAR_OPTIONS: ReadonlyArray<AvatarOption> = [
  {
    id: AvatarId.AVACADO,
    imagePath: "/avatars/avacado.png",
    fallback: "🥑",
    alt: "Avacado avatar",
  },
  {
    id: AvatarId.COLD,
    imagePath: "/avatars/cold.png",
    fallback: "🥶",
    alt: "Cold avatar",
  },
  {
    id: AvatarId.HOT,
    imagePath: "/avatars/hot.png",
    fallback: "🥵",
    alt: "Hot avatar",
  },
  {
    id: AvatarId.HUSH,
    imagePath: "/avatars/hush.png",
    fallback: "🤭",
    alt: "Shush avatar",
  },
  {
    id: AvatarId.LAUGH,
    imagePath: "/avatars/laugh.png",
    fallback: "😂",
    alt: "Laughing avatar",
  },
  {
    id: AvatarId.MONSTER,
    imagePath: "/avatars/monster.png",
    fallback: "😈",
    alt: "Monster avatar",
  },
  {
    id: AvatarId.NERD,
    imagePath: "/avatars/nerd.png",
    fallback: "🤓",
    alt: "Nerd avatar",
  },
  {
    id: AvatarId.PANDA,
    imagePath: "/avatars/panda.png",
    fallback: "🐼",
    alt: "Panda avatar",
  },
  {
    id: AvatarId.SKULL,
    imagePath: "/avatars/skull.png",
    fallback: "�",
    alt: "Skull avatar",
  },
  {
    id: AvatarId.SQUIDWARD,
    imagePath: "/avatars/squidward.png",
    fallback: "🦑",
    alt: "Squidward avatar",
  },
]

export const DEFAULT_AVATAR_ID = AvatarId.AVACADO

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
  themes: string[] | null // list of slugs
  speedMultiplier: number
  maxRounds: number
}

export const THEMES: ReadonlyArray<string> = [
  'MOVIES_AND_TV',
  'MUSIC',
  'VIDEO_GAMES',
  'BOOKS',
  'INTERNET_AND_SOCIAL_MEDIA',
  'TECH',
  'BRANDS_AND_BUSINESSES',
  'FOOD_AND_DRINK',
  'SPORTS',
  'GEOGRAPHY',
  'HISTORY',
  'SCIENCE_AND_NATURE',
  'ANIMALS',
  'LANGUAGE_AND_WORDS',
  'FLAGS'
]

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
