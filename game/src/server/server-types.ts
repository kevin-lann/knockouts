import type { Answer, Question } from "@shared/types"
import { AvatarId } from "@shared/types"

export interface LockedIdentity {
  name: string
  avatarId: AvatarId
}

export interface PrefetchedRound {
  round: number
  alivePlayerCount: number
  themes: string[] | null
  promise: Promise<{ question: Question; answers: Answer[] } | null>
}
