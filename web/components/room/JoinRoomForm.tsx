"use client"

import { useState } from "react"
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID } from "@/app/constants/avatars"
import { AvatarId } from "@/lib/types"
import type { PlayerProfile } from "@/lib/playerProfile"

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
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-white mb-2">
          Join Room
        </h1>
        <p className="text-white/70 text-center mb-8">Room: {roomId}</p>

        <div className="mb-6">
          <label className="block text-white mb-2">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                handleJoin()
              }
            }}
            placeholder="Enter your name"
            className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="block text-white mb-2">Choose Avatar</label>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setAvatarId(option.id)}
                className={`text-3xl p-2 rounded-lg transition-all ${
                  avatarId === option.id
                    ? "bg-white/30 scale-110 ring-2 ring-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {option.avatar}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={!name.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Join Room
        </button>
      </div>
    </div>
  )
}
