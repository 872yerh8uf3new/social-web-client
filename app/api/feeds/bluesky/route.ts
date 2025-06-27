import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "")

    // Use the correct AT Protocol endpoint for timeline
    const response = await fetch("https://bsky.social/xrpc/app.bsky.feed.getTimeline", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Bluesky API error:", errorText)
      return NextResponse.json({ error: "Failed to fetch timeline" }, { status: response.status })
    }

    const data = await response.json()

    const posts =
      data.feed?.map((item: any) => {
        const post = item.post
        const embed = post.embed

        // Extract images from embeds
        let images: string[] = []
        if (embed?.images) {
          images = embed.images.map((img: any) => img.fullsize || img.thumb)
        } else if (embed?.$type === "app.bsky.embed.images#view" && embed.images) {
          images = embed.images.map((img: any) => img.fullsize || img.thumb)
        }

        return {
          id: post.uri,
          author: post.author.displayName || post.author.handle,
          handle: `@${post.author.handle}`,
          content: post.record.text || "",
          timestamp: new Date(post.record.createdAt).toISOString(),
          network: "bluesky",
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0,
          avatar: post.author.avatar,
          images,
        }
      }) || []

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Bluesky feed error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
