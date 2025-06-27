import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const instance = request.headers.get("x-mastodon-instance")

    if (!authHeader || !instance) {
      return NextResponse.json({ error: "Authorization and instance required" }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "")

    const response = await fetch(`https://${instance}/api/v1/timelines/home`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch timeline" }, { status: response.status })
    }

    const data = await response.json()

    const posts = data.map((item: any) => {
      // Extract images from media attachments
      const images =
        item.media_attachments?.filter((media: any) => media.type === "image").map((media: any) => media.url) || []

      return {
        id: item.id,
        author: item.account.display_name || item.account.username,
        handle: `@${item.account.acct}`,
        content: item.content.replace(/<[^>]*>/g, ""), // Strip HTML
        timestamp: item.created_at,
        network: "mastodon",
        likes: item.favourites_count || 0,
        reposts: item.reblogs_count || 0,
        replies: item.replies_count || 0,
        avatar: item.account.avatar,
        images,
      }
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Mastodon feed error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
