import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  css?: string
}

export default function Card({ css, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white border-2 border-black shadow-[8px_8px_0_0_#000]",
        className,
        css
      )}
      {...props}
    />
  )
}
