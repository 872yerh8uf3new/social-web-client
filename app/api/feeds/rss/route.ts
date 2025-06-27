import { type NextRequest, NextResponse } from "next/server"

interface RSSItem {
  title?: string
  description?: string
  link?: string
  pubDate?: string
  guid?: string
  content?: string
  image?: string
}

interface RSSFeed {
  title?: string
  description?: string
  items: RSSItem[]
}

interface JSONFeedItem {
  id: string
  title?: string
  content_text?: string
  content_html?: string
  url?: string
  date_published?: string
  image?: string
  banner_image?: string
}

interface JSONFeed {
  title?: string
  description?: string
  items: JSONFeedItem[]
}

function parseRSSXML(xmlText: string): RSSFeed {
  const items: RSSItem[] = []

  // Extract feed title
  const titleMatch = xmlText.match(/<title[^>]*>(.*?)<\/title>/i)
  const feedTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") : "RSS Feed"

  // Extract items
  const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []

  for (const itemXml of itemMatches) {
    const item: RSSItem = {}

    // Extract title
    const titleMatch = itemXml.match(/<title[^>]*>(.*?)<\/title>/i)
    if (titleMatch) {
      item.title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "")
    }

    // Extract description
    const descMatch = itemXml.match(/<description[^>]*>(.*?)<\/description>/i)
    if (descMatch) {
      item.description = descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "")
    }

    // Extract content (content:encoded)
    const contentMatch = itemXml.match(/<content:encoded[^>]*>(.*?)<\/content:encoded>/i)
    if (contentMatch) {
      item.content = contentMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "")
    }

    // Extract link
    const linkMatch = itemXml.match(/<link[^>]*>(.*?)<\/link>/i)
    if (linkMatch) {
      item.link = linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    }

    // Extract pubDate
    const dateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)
    if (dateMatch) {
      item.pubDate = dateMatch[1]
    }

    // Extract guid
    const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/i)
    if (guidMatch) {
      item.guid = guidMatch[1]
    }

    // Extract image from enclosure or media:content
    const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]*)"[^>]*type="image[^"]*"/i)
    if (enclosureMatch) {
      item.image = enclosureMatch[1]
    } else {
      const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"[^>]*medium="image"/i)
      if (mediaMatch) {
        item.image = mediaMatch[1]
      }
    }

    items.push(item)
  }

  return {
    title: feedTitle,
    items: items.slice(0, 20),
  }
}

function parseJSONFeed(jsonText: string): JSONFeed {
  try {
    const feed = JSON.parse(jsonText)
    return {
      title: feed.title || "JSON Feed",
      description: feed.description,
      items: (feed.items || []).slice(0, 20),
    }
  } catch (error) {
    throw new Error("Invalid JSON feed format")
  }
}

export async function POST(request: NextRequest) {
  try {
    const { feedUrl } = await request.json()

    if (!feedUrl) {
      return NextResponse.json({ error: "Feed URL required" }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(feedUrl)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Fetch feed
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Social Web Client/1.0",
        Accept: "application/rss+xml, application/xml, text/xml, application/json, */*",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch feed: ${response.status} ${response.statusText}`,
        },
        { status: 400 },
      )
    }

    const contentType = response.headers.get("content-type") || ""
    const feedText = await response.text()

    let feed: RSSFeed | JSONFeed
    let isJSONFeed = false

    // Determine feed type and parse accordingly
    if (contentType.includes("application/json") || feedText.trim().startsWith("{")) {
      try {
        feed = parseJSONFeed(feedText)
        isJSONFeed = true
      } catch (error) {
        return NextResponse.json({ error: "Invalid JSON feed format" }, { status: 400 })
      }
    } else if (feedText.includes("<rss") || feedText.includes("<feed")) {
      feed = parseRSSXML(feedText)
    } else {
      return NextResponse.json({ error: "Invalid feed format" }, { status: 400 })
    }

    // Convert to unified post format
    const posts = feed.items.map((item, index) => {
      let content = ""
      const images: string[] = []

      if (isJSONFeed) {
        const jsonItem = item as JSONFeedItem
        content = jsonItem.content_text || jsonItem.content_html?.replace(/<[^>]*>/g, "") || jsonItem.title || ""
        if (jsonItem.image) images.push(jsonItem.image)
        if (jsonItem.banner_image) images.push(jsonItem.banner_image)
      } else {
        const rssItem = item as RSSItem
        content = rssItem.description || rssItem.content || rssItem.title || ""
        if (rssItem.image) images.push(rssItem.image)
      }

      return {
        id:
          (isJSONFeed ? (item as JSONFeedItem).id : (item as RSSItem).guid) ||
          (isJSONFeed ? (item as JSONFeedItem).url : (item as RSSItem).link) ||
          `${feedUrl}-${index}`,
        author: feed.title || "RSS Feed",
        handle: new URL(feedUrl).hostname,
        content,
        timestamp: (isJSONFeed ? (item as JSONFeedItem).date_published : (item as RSSItem).pubDate)
          ? new Date(isJSONFeed ? (item as JSONFeedItem).date_published! : (item as RSSItem).pubDate!).toISOString()
          : new Date().toISOString(),
        network: "rss",
        likes: 0,
        reposts: 0,
        replies: 0,
        link: isJSONFeed ? (item as JSONFeedItem).url : (item as RSSItem).link,
        images,
      }
    })

    return NextResponse.json({
      posts,
      feedTitle: feed.title,
      feedType: isJSONFeed ? "JSON Feed" : "RSS/XML",
    })
  } catch (error) {
    console.error("Feed parsing error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to parse feed",
      },
      { status: 500 },
    )
  }
}
