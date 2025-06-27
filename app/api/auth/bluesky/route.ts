import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json()

    const response = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier,
        password,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.message || "Authentication failed" }, { status: 400 })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
      handle: data.handle,
      did: data.did,
    })
  } catch (error) {
    console.error("Bluesky auth error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
