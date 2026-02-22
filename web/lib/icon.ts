import { IconId } from "@/lib/types"

const ICON_BY_ID: Record<IconId, string> = {
  [IconId.CROWN]: "👑",
  [IconId.ERROR]: "⚠️",
}

function isIconId(value: string): value is IconId {
  return Object.values(IconId).includes(value as IconId)
}

export function getIconById(iconId: string) {
  if (!isIconId(iconId)) {
    return ICON_BY_ID[IconId.ERROR]
  }
  return ICON_BY_ID[iconId]
}
