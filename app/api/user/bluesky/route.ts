import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "")

    // Get current user's profile
    const profileResponse = await fetch("https://bsky.social/xrpc/app.bsky.actor.getProfile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error("Bluesky profile error:", errorText)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: profileResponse.status })
    }

    const profile = await profileResponse.json()

    // Get user's posts
    const postsResponse = await fetch(
      `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${profile.handle}&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    )

    let posts = []
    if (postsResponse.ok) {
      const postsData = await postsResponse.json()
      posts =
        postsData.feed?.map((item: any) => ({
          id: item.post.uri,
          content: item.post.record.text || "",
          timestamp: item.post.record.createdAt,
          likes: item.post.likeCount || 0,
          reposts: item.post.repostCount || 0,
          replies: item.post.replyCount || 0,
        })) || []
    }

    return NextResponse.json({
      profile: {
        handle: profile.handle,
        displayName: profile.displayName || profile.handle,
        description: profile.description || "",
        avatar: profile.avatar,
        banner: profile.banner,
        followersCount: profile.followersCount || 0,
        followsCount: profile.followsCount || 0,
        postsCount: profile.postsCount || 0,
        createdAt: profile.createdAt,
      },
      posts,
    })
  } catch (error) {
    console.error("Bluesky user info error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
