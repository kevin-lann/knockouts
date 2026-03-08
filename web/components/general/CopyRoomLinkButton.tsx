import { toast } from "react-hot-toast"
import Button, { ButtonVariant } from "./Button"

export default function CopyRoomLinkButton({ roomId }: { roomId: string }) {
  const copyRoomLink = () => {
    const url = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(url)
    toast.success("Room link copied!")
  }

  return (
    <Button
      onClick={copyRoomLink}
      variant={ButtonVariant.BACKGROUND}
      className="px-4 py-2"
    >
      Copy Link
    </Button>
  )
}
