import { IconId } from "@shared/types"

const ICON_BY_ID: Record<IconId, string> = {
  [IconId.CROWN]: "👑",
  [IconId.ERROR]: "⚠️",
}

export function getIconById(iconId: IconId) {
  return ICON_BY_ID[iconId]
}
