"use client"

import type React from "react"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"

interface RichTextProps {
  content: string
  className?: string
  network?: string
}

interface ParsedPart {
  type: string
  content: string
  href?: string
  key: string
  isImage?: boolean
  imageUrl?: string
}

export function RichText({ content, className = "", network }: RichTextProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const { processedContent, images } = useMemo(() => {
    if (!content) return { processedContent: [], images: [] }

    // Split content into parts and process each
    const parts = content.split(/(\s+)/)
    const processed: ParsedPart[] = []
    const foundImages: string[] = []

    // Image extensions to detect
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?$/i

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]

      // URLs
      if (part.match(/^https?:\/\/[^\s]+/)) {
        const isImage = imageExtensions.test(part)

        if (isImage && network === "nostr") {
          // For Nostr, render images inline
          foundImages.push(part)
          processed.push({
            type: "image",
            content: part,
            href: part,
            key: `image-${i}`,
            isImage: true,
            imageUrl: part,
          })
        } else {
          // Regular link
          processed.push({
            type: "link",
            content: part,
            href: part,
            key: `link-${i}`,
          })
        }
      }
      // Hashtags
      else if (part.match(/^#[a-zA-Z0-9_]+/)) {
        processed.push({
          type: "hashtag",
          content: part,
          key: `hashtag-${i}`,
        })
      }
      // Mentions
      else if (part.match(/^@[a-zA-Z0-9_.]+/)) {
        processed.push({
          type: "mention",
          content: part,
          key: `mention-${i}`,
        })
      }
      // Nostr mentions (npub)
      else if (part.match(/^npub1[a-z0-9]+/)) {
        processed.push({
          type: "nostr-mention",
          content: part,
          key: `nostr-mention-${i}`,
        })
      }
      // Bold text
      else if (part.match(/^\*\*.*\*\*$/)) {
        processed.push({
          type: "bold",
          content: part.replace(/\*\*/g, ""),
          key: `bold-${i}`,
        })
      }
      // Italic text
      else if (part.match(/^\*.*\*$/)) {
        processed.push({
          type: "italic",
          content: part.replace(/\*/g, ""),
          key: `italic-${i}`,
        })
      }
      // Code
      else if (part.match(/^`.*`$/)) {
        processed.push({
          type: "code",
          content: part.replace(/`/g, ""),
          key: `code-${i}`,
        })
      }
      // Regular text
      else {
        processed.push({
          type: "text",
          content: part,
          key: `text-${i}`,
        })
      }
    }

    return { processedContent: processed, images: foundImages }
  }, [content, network])

  const openImageModal = (imageUrl: string) => {
    const imageIndex = images.indexOf(imageUrl)
    if (imageIndex !== -1) {
      setSelectedImageIndex(imageIndex)
      setCurrentImageIndex(imageIndex)
    }
  }

  const closeImageModal = () => {
    setSelectedImageIndex(null)
  }

  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Hide broken images
    e.currentTarget.style.display = "none"
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Ensure image is visible when loaded
    e.currentTarget.style.display = "block"
  }

  return (
    <>
      <span className={className}>
        {processedContent.map((part) => {
          switch (part.type) {
            case "image":
              return (
                <div key={part.key} className="my-2">
                  <div
                    className="relative rounded-lg overflow-hidden cursor-pointer max-w-md group"
                    onClick={() => openImageModal(part.imageUrl!)}
                  >
                    <img
                      src={part.imageUrl || "/placeholder.svg"}
                      alt="Nostr image"
                      className="w-full h-auto max-h-96 object-cover hover:opacity-90 transition-opacity"
                      loading="lazy"
                      onError={handleImageError}
                      onLoad={handleImageLoad}
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">Click to expand</div>
                    </div>
                  </div>
                  {/* Show original link below image for reference */}
                  <div className="mt-1">
                    <Link
                      href={part.href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-600 underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View original
                    </Link>
                  </div>
                </div>
              )
            case "link":
              return (
                <Link
                  key={part.key}
                  href={part.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 underline"
                >
                  {part.content}
                </Link>
              )
            case "hashtag":
              return (
                <span key={part.key} className="text-blue-500 hover:text-blue-600 cursor-pointer">
                  {part.content}
                </span>
              )
            case "mention":
              return (
                <span key={part.key} className="text-purple-500 hover:text-purple-600 cursor-pointer">
                  {part.content}
                </span>
              )
            case "nostr-mention":
              return (
                <span key={part.key} className="text-orange-500 hover:text-orange-600 cursor-pointer">
                  {part.content}
                </span>
              )
            case "bold":
              return (
                <strong key={part.key} className="font-bold">
                  {part.content}
                </strong>
              )
            case "italic":
              return (
                <em key={part.key} className="italic">
                  {part.content}
                </em>
              )
            case "code":
              return (
                <code key={part.key} className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                  {part.content}
                </code>
              )
            default:
              return <span key={part.key}>{part.content}</span>
          }
        })}
      </span>

      {/* Image Modal */}
      {images.length > 0 && (
        <Dialog open={selectedImageIndex !== null} onOpenChange={closeImageModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            {selectedImageIndex !== null && (
              <div className="relative">
                <img
                  src={images[currentImageIndex] || "/placeholder.svg"}
                  alt={`Nostr image ${currentImageIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                  crossOrigin="anonymous"
                />

                {images.length > 1 && (
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
                      disabled={currentImageIndex === images.length - 1}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}

                {/* Image URL for reference */}
                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs max-w-xs truncate">
                  {images[currentImageIndex]}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
