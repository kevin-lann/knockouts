import { RoomIdPrefix } from "@shared/types"

export function isPublicRoomId(roomId: string) {
  return roomId.startsWith(RoomIdPrefix.PUBLIC)
}
