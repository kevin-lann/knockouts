"use client"

import { useEffect, useState } from "react"
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
import { usePlayerDetails } from "@/hooks/usePlayerDetails"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { MONO_FONT } from "@/app/constants/font"

const VISIBLE_AVATAR_COUNT = 4
const AVATAR_ITEM_WIDTH_PX = 64
const AVATAR_ITEM_GAP_PX = 8
const AVATAR_TRAILING_DUMMY_COUNT = 1
const AVATAR_VIEWPORT_PADDING_PX = 8
const AVATAR_VIEWPORT_WIDTH_PX =
  VISIBLE_AVATAR_COUNT * AVATAR_ITEM_WIDTH_PX +
  (VISIBLE_AVATAR_COUNT - 1) * AVATAR_ITEM_GAP_PX +
  AVATAR_VIEWPORT_PADDING_PX * 2

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"public" | "private">("public")
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  const { name: storedName, avatarId: storedAvatarId } = usePlayerDetails()
  const [name, setName] = useState(storedName ?? "")
  const [avatarId, setAvatarId] = useState<AvatarId>(
    storedAvatarId ?? DEFAULT_AVATAR_ID
  )
  const [roomCode, setRoomCode] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (storedName && !name.trim()) {
      setName(storedName)
    }

    if (storedAvatarId && avatarId === DEFAULT_AVATAR_ID) {
      setAvatarId(storedAvatarId)
    }
  }, [storedName, storedAvatarId, name, avatarId])

  const selectedAvatarIndex = Math.max(
    AVATAR_OPTIONS.findIndex((option) => option.id === avatarId),
    0
  )
  const maxAvatarTrackStartIndex = Math.max(
    AVATAR_OPTIONS.length + AVATAR_TRAILING_DUMMY_COUNT - VISIBLE_AVATAR_COUNT,
    0
  )
  const avatarTrackStartIndex = Math.min(
    Math.max(selectedAvatarIndex - Math.floor(VISIBLE_AVATAR_COUNT / 2), 0),
    maxAvatarTrackStartIndex
  )

  const handlePreviousAvatar = () => {
    const previousIndex =
      (selectedAvatarIndex - 1 + AVATAR_OPTIONS.length) % AVATAR_OPTIONS.length
    setAvatarId(AVATAR_OPTIONS[previousIndex].id)
  }

  const handleNextAvatar = () => {
    const nextIndex = (selectedAvatarIndex + 1) % AVATAR_OPTIONS.length
    setAvatarId(AVATAR_OPTIONS[nextIndex].id)
  }

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
          <div className="rounded-xl border-2 border-[var(--foreground)] bg-background/60 px-3 py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePreviousAvatar}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--foreground)] bg-white text-xl font-bold transition-transform hover:scale-105"
                aria-label="Previous avatar"
              >
                ←
              </button>

              <div
                className="overflow-hidden px-2 py-1"
                style={{ width: `${AVATAR_VIEWPORT_WIDTH_PX}px` }}
              >
                <div
                  className="flex gap-2 transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(-${
                      avatarTrackStartIndex *
                      (AVATAR_ITEM_WIDTH_PX + AVATAR_ITEM_GAP_PX)
                    }px)`,
                  }}
                >
                  {AVATAR_OPTIONS.map((option) => (
                    <div key={option.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setAvatarId(option.id)}
                        className={`cursor-pointer rounded-full p-1 transition-all hover:scale-105 ${
                          avatarId === option.id
                            ? "scale-105 ring-2 ring-[var(--foreground)]"
                            : "opacity-70 hover:opacity-100"
                        }`}
                        aria-label={`Select ${option.alt}`}
                      >
                        <AvatarImage
                          imagePath={option.imagePath}
                          fallback={option.fallback}
                          alt={option.alt}
                          className="h-14 w-14"
                        />
                      </button>
                    </div>
                  ))}
                  <div
                    aria-hidden="true"
                    className="shrink-0 h-16 w-16 opacity-0 pointer-events-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextAvatar}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--foreground)] bg-white text-xl font-bold transition-transform hover:scale-105"
                aria-label="Next avatar"
              >
                →
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAvatarId(option.id)}
                  className={`h-2.5 w-2.5 rounded-full border border-[var(--foreground)] ${
                    avatarId === option.id
                      ? "bg-[var(--foreground)]"
                      : "bg-white opacity-50"
                  }`}
                  aria-label={`Select ${option.alt}`}
                />
              ))}
            </div>
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

        <div className="border-t-2 border-[var(--foreground)] pt-4">
          <button
            type="button"
            onClick={() =>
              setIsHowToPlayOpen((previousValue) => !previousValue)
            }
            className="flex w-full items-center justify-between text-left font-semibold"
            aria-expanded={isHowToPlayOpen}
            aria-controls="how-to-play-content"
          >
            <span>How to play</span>
            <span className="text-lg leading-none">
              {isHowToPlayOpen ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </span>
          </button>
          {isHowToPlayOpen && (
            <div id="how-to-play-content" className="mt-3 text-sm opacity-80">
              <p>1. Each round will ask a question.</p>
              <p>2. Correct answers get points.</p>
              <p>3. Duplicate answers get you knocked out</p>
              <p> Good Luck! </p>
            </div>
          )}
        </div>
      </Card>

      <div className={`${MONO_FONT.className} my-8 text-md`}>
        Built by{" "}
        <a
          className={`hover:text-brand-cyan`}
          href="https://x.com/kevinlann_"
          target="_blank"
          rel="noopener noreferrer"
        >
          @kevinlann_
        </a>
      </div>
    </div>
  )
}
