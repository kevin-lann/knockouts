"use client"

interface TimerProps {
  time: number;
}

export default function Timer({ time }: TimerProps) {
  const isLow = time <= 10
  const isCritical = time <= 5

  return (
    <div
      className={`text-6xl font-bold transition-all ${
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
