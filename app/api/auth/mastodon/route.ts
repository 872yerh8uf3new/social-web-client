import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { instance, code } = await request.json()

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${instance}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.MASTODON_CLIENT_ID,
        client_secret: process.env.MASTODON_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/mastodon/callback`,
        grant_type: "authorization_code",
        code,
      }),
    })

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: "Failed to exchange code for token" }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch(`https://${instance}/api/v1/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json({ error: "Failed to get user info" }, { status: 400 })
    }

    const userData = await userResponse.json()

    return NextResponse.json({
      success: true,
      accessToken: tokenData.access_token,
      handle: userData.acct,
      instance,
    })
  } catch (error) {
    console.error("Mastodon auth error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
