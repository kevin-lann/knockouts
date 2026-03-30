"use client"

import { KeyboardEvent, useState } from "react"
import Input from "@/components/general/Input"

interface NumberInputProps {
  value: number
  min: number
  max: number
  onValueCommit: (value: number) => void
  className?: string
  placeholder?: string
}

const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export default function NumberInput({
  value,
  min,
  max,
  onValueCommit,
  className,
  placeholder,
}: NumberInputProps) {
  const [draftValue, setDraftValue] = useState(value.toString())

  const commitValue = (rawValue: string) => {
    if (!rawValue.trim()) {
      const minValue = min
      setDraftValue(minValue.toString())
      onValueCommit(minValue)
      return
    }

    const parsedValue = Number.parseInt(rawValue, 10)
    if (Number.isNaN(parsedValue)) {
      setDraftValue(value.toString())
      return
    }

    const clampedValue = clampValue(parsedValue, min, max)
    setDraftValue(clampedValue.toString())
    onValueCommit(clampedValue)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitValue(draftValue)
      event.currentTarget.blur()
    }
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      min={min}
      max={max}
      value={draftValue}
      placeholder={placeholder}
      className={className}
      onChange={(event) => {
        const nextValue = event.target.value
        if (!/^\d*$/.test(nextValue)) return
        setDraftValue(nextValue)
      }}
      onBlur={(event) => commitValue(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}
