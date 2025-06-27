import { type NextRequest, NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"

export async function GET(request: NextRequest) {
  try {
    console.log("Starting Bluesky OAuth flow...")

    // Generate PKCE parameters using Node.js crypto
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateRandomString(32)

    console.log("Generated PKCE parameters")

    // Build the authorization URL
    const authUrl = buildAuthUrl(codeChallenge, state)
    console.log("Authorization URL:", authUrl)

    // Create response with redirect
    const response = NextResponse.redirect(authUrl)

    // Set secure cookies to store PKCE values
    response.cookies.set("oauth_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    })

    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    })

    console.log("Set cookies and redirecting...")
    return response
  } catch (error) {
    console.error("Bluesky OAuth initiation error:", error)
    return NextResponse.json(
      {
        error: "Failed to initiate OAuth",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function buildAuthUrl(codeChallenge: string, state: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

  const params = new URLSearchParams({
    response_type: "code",
    client_id: baseUrl, // For AT Protocol, client_id is often the app URL
    redirect_uri: `${baseUrl}/api/auth/bluesky/callback`,
    scope: "atproto transition:generic",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: state,
  })

  return `https://bsky.social/oauth/authorize?${params.toString()}`
}

function generateCodeVerifier(): string {
  // Generate 32 random bytes and encode as base64url
  const buffer = randomBytes(32)
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function generateCodeChallenge(verifier: string): string {
  // Create SHA256 hash of the verifier and encode as base64url
  const hash = createHash("sha256").update(verifier).digest("base64")
  return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function generateRandomString(length: number): string {
  const buffer = randomBytes(Math.ceil((length * 3) / 4))
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").substring(0, length)
}
