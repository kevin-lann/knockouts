import { customAlphabet } from "nanoid"

export enum RoomIdPrefix {
  PUBLIC = "PUB-",
  PRIVATE = "PRV-",
}

const ROOM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 8)

export function createPublicRoomId() {
  return `${RoomIdPrefix.PUBLIC}${generateRoomCode()}`
}

export function createPrivateRoomId() {
  return `${RoomIdPrefix.PRIVATE}${generateRoomCode()}`
}
