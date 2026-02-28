import { ClientMessage, ClientMessageType } from "@shared/types"
import { useRouter } from "next/navigation"


export default function LeaveRoomButton({ send }: { send: (message: ClientMessage) => void }) {
  const router = useRouter()
  const handleLeaveRoom = () => {
    send({ type: ClientMessageType.LEAVE_ROOM })
    router.push("/")
  }
  return (
    <button
      onClick={handleLeaveRoom}
      className="px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-all cursor-pointer"
    >
      Leave Room
    </button>
  )
}
