import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("Bluesky OAuth callback received")

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    if (error) {
      console.error("OAuth error:", error, errorDescription)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      return NextResponse.redirect(
        `${baseUrl}/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`,
      )
    }

    if (!code || !state) {
      console.error("Missing code or state")
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/?error=missing_code_or_state`)
    }

    // Verify state and get code verifier from cookies
    const storedState = request.cookies.get("oauth_state")?.value
    const codeVerifier = request.cookies.get("oauth_code_verifier")?.value

    console.log("Stored state:", storedState, "Received state:", state)
    console.log("Code verifier present:", !!codeVerifier)

    if (!storedState || !codeVerifier || storedState !== state) {
      console.error("Invalid state or missing verifier")
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/?error=invalid_state`)
    }

    // Exchange code for token using AT Protocol OAuth
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    console.log("Exchanging code for token...")
    const tokenResponse = await fetch("https://bsky.social/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${baseUrl}/api/auth/bluesky/callback`,
        client_id: baseUrl,
        code_verifier: codeVerifier,
      }),
    })

    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token exchange failed:", errorText)
      return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed&details=${encodeURIComponent(errorText)}`)
    }

    const tokenData = await tokenResponse.json()
    console.log("Token data received:", Object.keys(tokenData))

    // Get user profile using the access token
    let handle = "unknown"
    try {
      const profileResponse = await fetch("https://bsky.social/xrpc/app.bsky.actor.getProfile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        handle = profileData.handle || tokenData.sub || "unknown"
        console.log("Got user handle:", handle)
      } else {
        console.warn("Failed to get profile, using fallback handle")
        handle = tokenData.sub || "unknown"
      }
    } catch (profileError) {
      console.warn("Profile fetch error:", profileError)
      handle = tokenData.sub || "unknown"
    }

    // Create response and clear OAuth cookies
    const redirectUrl = new URL(baseUrl)
    redirectUrl.searchParams.set("bluesky_auth", "success")
    redirectUrl.searchParams.set("access_token", tokenData.access_token)
    redirectUrl.searchParams.set("handle", handle)

    const response = NextResponse.redirect(redirectUrl.toString())

    // Clear OAuth cookies
    response.cookies.delete("oauth_code_verifier")
    response.cookies.delete("oauth_state")

    console.log("OAuth flow completed successfully")
    return response
  } catch (error) {
    console.error("Bluesky OAuth callback error:", error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    return NextResponse.redirect(
      `${baseUrl}/?error=callback_failed&details=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`,
    )
  }
}
