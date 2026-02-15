"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AVATARS } from "@/app/constants/avatars"

interface JoinRoomFormProps {
  roomId: string
}

export default function JoinRoomForm({ roomId }: JoinRoomFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState(AVATARS[0])

  const handleJoin = () => {
    if (!name.trim()) return

    // Preserve existing query params (like private=true) and add name/avatar
    const params = new URLSearchParams(searchParams.toString())
    params.set("name", name.trim())
    params.set("avatar", avatar)

    router.push(`/room/${roomId}?${params.toString()}`)
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
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => setAvatar(av)}
                className={`text-3xl p-2 rounded-lg transition-all ${
                  avatar === av
                    ? "bg-white/30 scale-110 ring-2 ring-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {av}
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
