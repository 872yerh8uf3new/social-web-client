"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Heart, MessageCircle, Share, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"

export function ClipsContent() {
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set())

  const clips = [
    {
      id: "1",
      title: "Building on Nostr: A Developer's Journey",
      author: "TechBuilder",
      handle: "npub1tech...",
      network: "nostr",
      duration: "2:34",
      views: "12.5K",
      likes: 234,
      comments: 45,
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "A deep dive into building decentralized applications on the Nostr protocol",
    },
    {
      id: "2",
      title: "Mastodon vs Twitter: The Great Migration",
      author: "SocialAnalyst",
      handle: "@analyst@mastodon.social",
      network: "mastodon",
      duration: "4:12",
      views: "8.9K",
      likes: 156,
      comments: 78,
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "Analyzing the shift from centralized to decentralized social media",
    },
    {
      id: "3",
      title: "Bluesky Protocol Explained",
      author: "CryptoEducator",
      handle: "@educator.bsky.social",
      network: "bluesky",
      duration: "3:45",
      views: "15.2K",
      likes: 312,
      comments: 89,
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "Understanding the AT Protocol that powers Bluesky",
    },
    {
      id: "4",
      title: "RSS in 2024: Still Relevant?",
      author: "WebVeteran",
      handle: "webveteran@blog.com",
      network: "rss",
      duration: "1:58",
      views: "5.7K",
      likes: 89,
      comments: 23,
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "Why RSS feeds remain important in the modern web",
    },
    {
      id: "5",
      title: "Cross-Platform Social Strategy",
      author: "MarketingPro",
      handle: "@marketing.bsky.social",
      network: "bluesky",
      duration: "5:21",
      views: "9.8K",
      likes: 178,
      comments: 56,
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "How to maintain presence across multiple social networks",
    },
    {
      id: "6",
      title: "Decentralized Identity Deep Dive",
      author: "IdentityExpert",
      handle: "npub1identity...",
      network: "nostr",
      duration: "6:33",
      views: "7.3K",
      likes: 145,
      comments: 67,
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "Exploring self-sovereign identity in decentralized networks",
    },
  ]

  const networkColors = {
    bluesky: "bg-sky-500",
    mastodon: "bg-purple-500",
    nostr: "bg-orange-500",
    rss: "bg-green-500",
  }

  const toggleMute = (videoId: string) => {
    const newMuted = new Set(mutedVideos)
    if (newMuted.has(videoId)) {
      newMuted.delete(videoId)
    } else {
      newMuted.add(videoId)
    }
    setMutedVideos(newMuted)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 to-sky-400 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Clips</h1>
          <p className="text-white/80">Discover videos from across the decentralized social web</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clips.map((clip) => (
            <Card key={clip.id} className="overflow-hidden">
              <div className="relative group">
                <img src={clip.thumbnail || "/placeholder.svg"} alt={clip.title} className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Button size="lg" className="opacity-80 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 mr-2" />
                    Play
                  </Button>
                </div>
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge className="bg-black/50 text-white text-xs">{clip.duration}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-black/50 hover:bg-black/70 text-white p-1 h-auto"
                    onClick={() => toggleMute(clip.id)}
                  >
                    {mutedVideos.has(clip.id) ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="absolute bottom-2 left-2">
                  <Badge className={`text-xs ${networkColors[clip.network as keyof typeof networkColors]} text-white`}>
                    {clip.network}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{clip.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{clip.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{clip.author}</p>
                      <p className="text-xs text-slate-500 truncate">{clip.handle}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{clip.views} views</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {clip.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {clip.comments}
                      </span>
                      <Button variant="ghost" size="sm" className="p-0 h-auto">
                        <Share className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
