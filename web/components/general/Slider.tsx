import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  css?: string
}

export default function Slider({ css, className, ...props }: SliderProps) {
  return (
    <input
      type="range"
      className={cn(
        "w-full cursor-pointer appearance-none rounded-none bg-transparent",
        "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:border-2 [&::-webkit-slider-runnable-track]:border-[var(--foreground)] [&::-webkit-slider-runnable-track]:bg-white",
        "[&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--foreground)] [&::-webkit-slider-thumb]:bg-brand-cyan",
        "[&::-moz-range-track]:h-2 [&::-moz-range-track]:border-2 [&::-moz-range-track]:border-[var(--foreground)] [&::-moz-range-track]:bg-white",
        "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--foreground)] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-brand-cyan",
        className,
        css
      )}
      {...props}
    />
  )
}
