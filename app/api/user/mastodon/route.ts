import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const instance = request.headers.get("x-mastodon-instance")

    if (!authHeader || !instance) {
      return NextResponse.json({ error: "Authorization and instance required" }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "")

    // Get current user's profile
    const profileResponse = await fetch(`https://${instance}/api/v1/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!profileResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: profileResponse.status })
    }

    const profile = await profileResponse.json()

    // Get user's posts
    const postsResponse = await fetch(`https://${instance}/api/v1/accounts/${profile.id}/statuses?limit=20`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    let posts = []
    if (postsResponse.ok) {
      const postsData = await postsResponse.json()
      posts = postsData.map((post: any) => ({
        id: post.id,
        content: post.content.replace(/<[^>]*>/g, ""), // Strip HTML
        timestamp: post.created_at,
        likes: post.favourites_count || 0,
        reposts: post.reblogs_count || 0,
        replies: post.replies_count || 0,
      }))
    }

    return NextResponse.json({
      profile: {
        handle: `@${profile.acct}`,
        displayName: profile.display_name || profile.username,
        description: profile.note?.replace(/<[^>]*>/g, "") || "",
        avatar: profile.avatar,
        banner: profile.header,
        followersCount: profile.followers_count || 0,
        followsCount: profile.following_count || 0,
        postsCount: profile.statuses_count || 0,
        createdAt: profile.created_at,
      },
      posts,
    })
  } catch (error) {
    console.error("Mastodon user info error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
