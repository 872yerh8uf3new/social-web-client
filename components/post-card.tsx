"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Repeat2, Share, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { RichText } from "./rich-text"

interface Post {
  id: string
  author: string
  handle: string
  content: string
  timestamp: string
  network: string
  likes: number
  reposts: number
  replies: number
  avatar?: string
  link?: string
  images?: string[]
}

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const networkColors = {
    bluesky: "bg-sky-500",
    mastodon: "bg-purple-500",
    nostr: "bg-orange-500",
    rss: "bg-green-500",
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index)
    setCurrentImageIndex(index)
  }

  const closeImageModal = () => {
    setSelectedImageIndex(null)
  }

  const nextImage = () => {
    if (post.images && currentImageIndex < post.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0 overflow-hidden">
              {post.avatar ? (
                <img src={post.avatar || "/placeholder.svg"} alt={post.author} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm truncate">{post.author}</span>
                <span className="text-muted-foreground text-sm truncate">{post.handle}</span>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm">{formatTimestamp(post.timestamp)}</span>
                <Badge
                  className={`ml-auto text-xs ${networkColors[post.network as keyof typeof networkColors]} text-white`}
                >
                  {post.network}
                </Badge>
              </div>

              {/* Rich text content with network-aware parsing */}
              <div className="text-sm mb-3 whitespace-pre-wrap">
                <RichText content={post.content} network={post.network} />
              </div>

              {/* Image Gallery (for non-Nostr networks or additional images) */}
              {post.images && post.images.length > 0 && post.network !== "nostr" && (
                <div className="mb-3">
                  {post.images.length === 1 ? (
                    <div className="rounded-lg overflow-hidden cursor-pointer" onClick={() => openImageModal(0)}>
                      <img
                        src={post.images[0] || "/placeholder.svg"}
                        alt="Post image"
                        className="w-full max-h-96 object-cover hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {post.images.slice(0, 4).map((image, index) => (
                        <div
                          key={index}
                          className="relative rounded-lg overflow-hidden cursor-pointer aspect-square"
                          onClick={() => openImageModal(index)}
                        >
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Post image ${index + 1}`}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                          {index === 3 && post.images.length > 4 && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <span className="text-white font-semibold">+{post.images.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {post.link && (
                <Button variant="outline" size="sm" className="mb-3 bg-transparent" asChild>
                  <a href={post.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Read More
                  </a>
                </Button>
              )}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500">
                  <Heart className="w-4 h-4 mr-1" />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-green-500">
                  <Repeat2 className="w-4 h-4 mr-1" />
                  {post.reposts}
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-blue-500">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {post.replies}
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-slate-700 ml-auto">
                  <Share className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Modal (for non-Nostr networks) */}
      {post.network !== "nostr" && (
        <Dialog open={selectedImageIndex !== null} onOpenChange={closeImageModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            {post.images && selectedImageIndex !== null && (
              <div className="relative">
                <img
                  src={post.images[currentImageIndex] || "/placeholder.svg"}
                  alt={`Post image ${currentImageIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />

                {post.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={prevImage}
                      disabled={currentImageIndex === 0}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={nextImage}
                      disabled={currentImageIndex === post.images.length - 1}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {post.images.length}
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
