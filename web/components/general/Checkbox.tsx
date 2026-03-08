import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  css?: string
}

export default function Checkbox({ css, className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 accent-brand-cyan bg-white outline-2 outline-black outline-offset-[-2px] focus:outline-2 focus:outline-black",
        className,
        css
      )}
      {...props}
    />
  )
}
