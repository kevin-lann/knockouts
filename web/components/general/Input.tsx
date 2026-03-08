import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  css?: string
}

export default function Input({ css, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full px-4 py-2 border-2 border-[var(--foreground)] bg-white focus:outline-none focus:ring-2 focus:ring-black/20",
        className,
        css
      )}
      {...props}
    />
  )
}
