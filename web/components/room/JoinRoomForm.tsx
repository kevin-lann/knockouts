"use client"

import { useState } from "react"
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID } from "@/app/constants/avatars"
import { AvatarId } from "@shared/types"
import type { PlayerProfile } from "@/lib/playerProfile"
import Button, { ButtonVariant } from "../general/Button"
import Card from "../general/Card"
import Input from "../general/Input"
import Logo from "../general/logo"

interface JoinRoomFormProps {
  roomId: string
  initialProfile: PlayerProfile | null
  onJoin: (profile: PlayerProfile) => void
}

export default function JoinRoomForm({
  roomId,
  initialProfile,
  onJoin,
}: JoinRoomFormProps) {
  const [name, setName] = useState(initialProfile?.name ?? "")
  const [avatarId, setAvatarId] = useState<AvatarId>(
    initialProfile?.avatarId ?? DEFAULT_AVATAR_ID
  )

  const handleJoin = () => {
    if (!name.trim()) return

    onJoin({
      name: name.trim(),
      avatarId,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Logo />
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            Join Room
          </h1>
          <p className="text-center mb-8">Room: {roomId}</p>

          <div className="mb-6">
            <label className="block mb-2">Who are you?</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleJoin()
                }
              }}
              placeholder="Enter your name"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2">What do you look like?</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAvatarId(option.id)}
                  className={`text-3xl p-2 cursor-pointer transition-all hover:scale-125 ${
                    avatarId === option.id
                      ? "bg-background scale-110 ring-2 ring-black"
                      : "bg-background/40 border-2 border-black hover:bg-background"
                  }`}
                >
                  {option.avatar}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleJoin}
            disabled={!name.trim()}
            variant={ButtonVariant.YELLOW}
            className="w-full py-3"
          >
            Join Room
          </Button>
        </Card>
      </div>
    </div>
  )
}
