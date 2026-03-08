"use client"

import { KeyboardEvent } from "react"
import Button, { ButtonVariant } from "../general/Button"
import Input from "../general/Input"

interface AnswerInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  submitted: boolean
  isEliminated: boolean
}

export default function AnswerInput({
  value,
  onChange,
  onSubmit,
  disabled,
  submitted,
  isEliminated,
}: AnswerInputProps) {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled && value.trim()) {
      onSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {submitted && (
        <div className="bg-brand-cyan/30 border-2 border-[var(--foreground)] p-4">
          <p className="font-semibold text-center">Answer: {value}</p>
          <p className="text-sm text-center mt-2">
            You can modify your answer until time runs out
          </p>
        </div>
      )}
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={
          isEliminated
            ? "You are eliminated, you can only spectate"
            : "Type your answer..."
        }
        disabled={disabled}
        className={`px-6 py-4 text-lg ${
          isEliminated ? "opacity-50 cursor-not-allowed" : ""
        }`}
        autoFocus
      />
      <Button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        variant={ButtonVariant.YELLOW}
        className="w-full mt-4 py-3"
      >
        Submit Answer
      </Button>
    </div>
  )
}
