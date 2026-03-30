"use client"

import { CSSProperties, useMemo } from "react"
import Image from "next/image"
import { AVATAR_OPTIONS } from "@/app/constants/avatars"
import Logo from "@/components/general/logo"
import { AvatarId } from "@shared/types"

interface AvatarMotionSpec {
  id: AvatarId
  imagePath: string
  alt: string
  left: string
  top: string
  initialRotation: string
  spinRotation: string
  fallDuration: string
  spinDuration: string
  fallDelay: string
}

const SCALE_CLASS = "h-48 w-48"

function getHashFromString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

function getDeterministicInRange(key: string, min: number, max: number) {
  const hash = getHashFromString(key)
  const ratio = hash / 4294967295
  return min + ratio * (max - min)
}

export default function PromotionPage() {
  const avatarSpecs = useMemo<AvatarMotionSpec[]>(() => {
    const count = AVATAR_OPTIONS.length

    return AVATAR_OPTIONS.map((avatar, index) => {
      const baseAngle = (index / count) * Math.PI * 2
      const jitter = getDeterministicInRange(`${avatar.id}-jitter`, -0.2, 0.2)
      const radius = getDeterministicInRange(`${avatar.id}-radius`, 30, 42)
      const spinDirection =
        getDeterministicInRange(`${avatar.id}-spin-direction`, 0, 1) < 0.5
          ? -1
          : 1
      const spinMagnitude = getDeterministicInRange(
        `${avatar.id}-spin-amount`,
        280,
        420
      )
      const angle = baseAngle + jitter
      const x = 50 + Math.cos(angle) * radius
      const y = 50 + Math.sin(angle) * radius

      return {
        id: avatar.id,
        imagePath: avatar.imagePath,
        alt: avatar.alt,
        left: `${x.toFixed(3)}%`,
        top: `${y.toFixed(3)}%`,
        initialRotation: `${getDeterministicInRange(`${avatar.id}-rot`, -32, 32).toFixed(2)}deg`,
        spinRotation: `${(spinDirection * spinMagnitude).toFixed(2)}deg`,
        fallDuration: `${getDeterministicInRange(`${avatar.id}-fall`, 22, 36).toFixed(2)}s`,
        spinDuration: `${getDeterministicInRange(`${avatar.id}-spin`, 20, 38).toFixed(2)}s`,
        fallDelay: `${getDeterministicInRange(`${avatar.id}-delay`, -12, 0).toFixed(2)}s`,
      }
    })
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6">
      {avatarSpecs.map((spec) => {
        return (
          <div
            key={spec.id}
            className="promotion-avatar-fall absolute"
            style={{
              left: spec.left,
              top: spec.top,
              animationDuration: spec.fallDuration,
              animationDelay: spec.fallDelay,
            }}
          >
            <div
              className="promotion-avatar-spin"
              style={
                {
                  "--start-rotation": spec.initialRotation,
                  "--spin-rotation": spec.spinRotation,
                  animationDuration: spec.spinDuration,
                } as CSSProperties
              }
            >
              <div className={`relative ${SCALE_CLASS}`}>
                <Image
                  src={spec.imagePath}
                  alt={spec.alt}
                  fill
                  sizes="192px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        )
      })}

      <div className="relative z-10 rounded-3xl px-10 py-8">
        <div className="-mb-8">
          <Logo />
        </div>
      </div>
    </div>
  )
}
