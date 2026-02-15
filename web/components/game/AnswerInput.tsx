"use client"

import { KeyboardEvent } from "react"

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  submitted: boolean;
  isEliminated: boolean;
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

  if (submitted) {
    return (
      <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
        <p className="text-green-300 font-semibold text-center">
          Answer Submitted: {value}
        </p>
        <p className="text-green-200/70 text-sm text-center mt-2">
          You can modify your answer until time runs out
        </p>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={isEliminated ? "You are eliminated, you can only spectate" : "Type your answer..."}
        disabled={disabled}
        className={`w-full px-6 py-4 text-lg bg-white/20 text-white placeholder-white/60 rounded-lg border-2 border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 disabled:opacity-50 ${isEliminated ? "opacity-50 cursor-not-allowed" : ""}`}
        autoFocus
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Submit Answer
      </button>
    </div>
  )
}
