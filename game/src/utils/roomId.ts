export enum RoomIdPrefix {
  PUBLIC = "PUB-",
  PRIVATE = "PRV-",
}

export function isPublicRoomId(roomId: string) {
  return roomId.startsWith(RoomIdPrefix.PUBLIC)
}
