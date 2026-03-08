import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export enum ButtonVariant {
  YELLOW = "yellow",
  CYAN = "cyan",
  BACKGROUND = "background",
  PINK = "pink",
}

const variantClasses: Record<ButtonVariant, string> = {
  [ButtonVariant.YELLOW]: "bg-brand-yellow",
  [ButtonVariant.CYAN]: "bg-brand-cyan",
  [ButtonVariant.BACKGROUND]: "bg-background",
  [ButtonVariant.PINK]: "bg-brand-pink",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  css?: string
}

export default function Button({
  variant = ButtonVariant.YELLOW,
  css,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "border-2 border-black cursor-pointer shadow-[2px_2px_0_0_#000] font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
        css
      )}
      {...props}
    />
  )
}
