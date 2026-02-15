import { NextResponse } from "next/server"
import { AvatarId } from "@/lib/types"
import { createJoinToken } from "@/lib/joinToken"

function isAvatarId(value: string): value is AvatarId {
  return Object.values(AvatarId).includes(value as AvatarId)
}

interface JoinTokenRequest {
  roomId?: string
  clientId?: string
  name?: string
  avatarId?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JoinTokenRequest
    const roomId = body.roomId?.trim()
    const clientId = body.clientId?.trim()
    const name = body.name?.trim()
    const avatarId = body.avatarId?.trim()

    if (!roomId || !clientId || !name || !avatarId || !isAvatarId(avatarId)) {
      return NextResponse.json({ error: "Invalid join token request" }, { status: 400 })
    }

    const joinToken = await createJoinToken({
      roomId,
      clientId,
      name,
      avatarId,
    })

    return NextResponse.json({ joinToken })
  } catch (error) {
    console.error("Failed to create join token", error)
    return NextResponse.json({ error: "Failed to create join token" }, { status: 500 })
  }
}
