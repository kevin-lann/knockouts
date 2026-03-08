"use client"

import { HEADER_FONT } from "@/app/constants/font"

interface TimerProps {
  time: number
}

export default function Timer({ time }: TimerProps) {
  const isLow = time <= 10
  const isCritical = time <= 5

  return (
    <div
      className={`text-6xl font-bold transition-all ${HEADER_FONT.className} ${
        isCritical
          ? "text-red-400 animate-pulse"
          : isLow
          ? "text-yellow-400"
          : "text-foreground"
      }`}
    >
      {time}
    </div>
  )
}
