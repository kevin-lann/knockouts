import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarImageProps {
  imagePath: string
  fallback: string
  alt: string
  className?: string
  fallbackClassName?: string
}

export default function AvatarImage({
  imagePath,
  fallback,
  alt,
  className,
  fallbackClassName,
}: AvatarImageProps) {
  return (
    <div
      className={cn(
        "relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-background",
        className
      )}
      aria-label={alt}
    >
      <span className={cn("text-2xl leading-none", fallbackClassName)}>
        {fallback}
      </span>
      <Image
        src={imagePath}
        alt={alt}
        fill
        sizes="56px"
        className="absolute inset-0 object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none"
        }}
      />
    </div>
  )
}
