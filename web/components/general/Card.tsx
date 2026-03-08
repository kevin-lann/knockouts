import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  css?: string
}

export default function Card({ css, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border-2 border-[var(--foreground)] shadow-[8px_8px_0_0_var(--foreground)]",
        className,
        css
      )}
      {...props}
    />
  )
}
