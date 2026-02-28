"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID } from "@/app/constants/avatars"
import { createPrivateRoomId, createPublicRoomId } from "@/lib/roomId"
import { AvatarId } from "@shared/types"
import { setStoredPlayerProfile } from "@/lib/playerProfile"

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-center text-white mb-8">
        Knockouts
      </h1>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="mb-6">
          <label className="block text-white mb-2">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
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

        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("public")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === "public"
                  ? "bg-white/30 text-white font-semibold"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Public
            </button>
            <button
              onClick={() => setActiveTab("private")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                activeTab === "private"
                  ? "bg-white/30 text-white font-semibold"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              Private
            </button>
          </div>

          {activeTab === "public" ? (
            <button
              onClick={handlePublicPlay}
              disabled={!name.trim() || isSearching}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSearching ? "Finding room..." : "Play"}
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleCreatePrivate}
                disabled={!name.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Create Room
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Room Code"
                  className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                  onClick={handleJoinPrivate}
                  disabled={!name.trim() || !roomCode.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Join
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
