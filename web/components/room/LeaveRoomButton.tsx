import { ClientMessage, ClientMessageType } from "@shared/types"
import { useRouter } from "next/navigation"
import Button, { ButtonVariant } from "../general/Button"
import useDevice from "@/hooks/useDevice"

export default function LeaveRoomButton({ send }: { send: (message: ClientMessage) => void }) {
  const router = useRouter()
  const handleLeaveRoom = () => {
    send({ type: ClientMessageType.LEAVE_ROOM })
    router.push("/")
  }
  const { isMobile } = useDevice()
  return (
    <Button
      onClick={handleLeaveRoom}
      variant={ButtonVariant.PINK}
      className="px-4 py-2"
    >
      {isMobile ? "Leave" : "Leave Room"}
    </Button>
  )
}
