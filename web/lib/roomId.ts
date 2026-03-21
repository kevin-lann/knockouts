import { customAlphabet } from "nanoid"
import { RoomIdPrefix } from "@shared/types"

const ROOM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 4)

export function createPublicRoomId() {
  return `${RoomIdPrefix.PUBLIC}${generateRoomCode()}`
}

export function createPrivateRoomId() {
  return `${RoomIdPrefix.PRIVATE}${generateRoomCode()}`
}
