"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID } from "@/app/constants/avatars"
import { createPrivateRoomId, createPublicRoomId } from "@/lib/roomId"
import { AvatarId } from "@shared/types"
import { setStoredPlayerProfile } from "@/lib/playerProfile"
import Logo from "../general/logo"
import Button, { ButtonVariant } from "../general/Button"
import Card from "../general/Card"
import Input from "../general/Input"
import AvatarImage from "../general/AvatarImage"

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"public" | "private">("public")
  const [name, setName] = useState("")
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID)
  const [roomCode, setRoomCode] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const persistProfile = () => {
    setStoredPlayerProfile({
      name,
      avatarId,
    })
  }

  const handlePublicPlay = async () => {
    if (!name.trim()) return
    persistProfile()
    setIsSearching(true)

    try {
      const response = await fetch("/api/find-room")
      const data = await response.json()
      // Public room - no host=true param
      router.push(`/room/${data.roomId}`)
    } catch (error) {
      console.error("Error finding room:", error)
      // Fallback to creating a new room (still public)
      const randomRoomId = createPublicRoomId()
      router.push(`/room/${randomRoomId}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreatePrivate = () => {
    if (!name.trim()) return
    persistProfile()
    const roomId = createPrivateRoomId()
    router.push(`/room/${roomId}`)
  }

  const handleJoinPrivate = () => {
    if (!name.trim() || !roomCode.trim()) return
    persistProfile()
    router.push(`/room/${roomCode}`)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
    >
      <Logo />
      <Card className="p-8 w-full max-w-md">
        <div className="mb-6">
          <label className="block  mb-2">Who are you?</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="mb-6">
          <label className="block  mb-2">What do you look like?</label>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setAvatarId(option.id)}
                className={`cursor-pointer rounded-full p-1 transition-all hover:scale-110 ${
                  avatarId === option.id
                    ? "scale-105 ring-2 ring-[var(--foreground)]"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <AvatarImage
                  imagePath={option.imagePath}
                  fallback={option.fallback}
                  alt={option.alt}
                  className="h-14 w-14"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <Button
              onClick={() => setActiveTab("public")}
              variant={ButtonVariant.BACKGROUND}
              className={`flex-1 py-2 ${
                activeTab === "public"
                  ? "font-semibold"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              Public
            </Button>
            <Button
              onClick={() => setActiveTab("private")}
              variant={ButtonVariant.BACKGROUND}
              className={`flex-1 py-2 ${
                activeTab === "private"
                  ? "font-semibold"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              Private
            </Button>
          </div>

          {activeTab === "public" ? (
            <Button
              onClick={handlePublicPlay}
              disabled={!name.trim() || isSearching}
              variant={ButtonVariant.YELLOW}
              className="w-full py-3"
            >
              {isSearching ? "Finding room..." : "Play"}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleCreatePrivate}
                disabled={!name.trim()}
                variant={ButtonVariant.YELLOW}
                className="w-full py-3"
              >
                Create Room
              </Button>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Room Code"
                  className="flex-1"
                />
                <Button
                  onClick={handleJoinPrivate}
                  disabled={!name.trim() || !roomCode.trim()}
                  variant={ButtonVariant.CYAN}
                  className="px-6 py-2"
                >
                  Join
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
