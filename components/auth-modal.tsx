"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "./auth-provider"
import { checkNIP07Support } from "@/lib/nostr"
import { Badge } from "@/components/ui/badge"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [mastodonInstance, setMastodonInstance] = useState("")
  const [rssUrl, setRssUrl] = useState("")
  const [nip07Status, setNip07Status] = useState<{ available: boolean; extension?: string }>({ available: false })
  const { toast } = useToast()
  const { updateAuth } = useAuth()

  useEffect(() => {
    // Check NIP-07 availability when modal opens
    if (open) {
      checkNIP07Support().then(setNip07Status)
    }
  }, [open])

  const handleBlueskyConnect = async () => {
    setLoading("bluesky")

    try {
      // Redirect to our OAuth endpoint which will handle PKCE and redirect to Bluesky
      window.location.href = "/api/auth/bluesky/oauth"
    } catch (error) {
      console.error("Bluesky OAuth error:", error)
      toast({
        title: "Error",
        description: "Failed to initiate Bluesky OAuth",
        variant: "destructive",
      })
      setLoading(null)
    }
  }

  const handleMastodonConnect = async () => {
    if (!mastodonInstance) {
      toast({
        title: "Error",
        description: "Please enter a Mastodon instance",
        variant: "destructive",
      })
      return
    }

    setLoading("mastodon")

    try {
      // Redirect to Mastodon OAuth
      const clientId = process.env.NEXT_PUBLIC_MASTODON_CLIENT_ID
      const redirectUri = `${window.location.origin}/api/auth/mastodon/callback`
      const scope = "read write follow"

      const authUrl = `https://${mastodonInstance}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`

      window.location.href = authUrl
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Mastodon OAuth",
        variant: "destructive",
      })
      setLoading(null)
    }
  }

  const handleNostrConnect = async () => {
    setLoading("nostr")

    try {
      // Re-check NIP-07 availability
      const nip07 = await checkNIP07Support()

      if (nip07.available && window.nostr) {
        try {
          // Test the extension by getting public key
          const pubkey = await window.nostr.getPublicKey()

          updateAuth("nostr", {
            authenticated: true,
            pubkey,
            isDemo: false,
            extension: nip07.extension,
          })

          toast({
            title: "Connected!",
            description: `Successfully connected to Nostr via ${nip07.extension}. You'll see real-time updates!`,
          })
        } catch (error: any) {
          console.error("NIP-07 connection error:", error)

          // Fall back to public mode if extension fails
          updateAuth("nostr", {
            authenticated: true,
            pubkey: "public-relay-user",
            isDemo: true,
            extension: undefined,
          })

          toast({
            title: "Extension Error",
            description: `${nip07.extension} extension found but failed to connect. Using public mode instead.`,
            variant: "destructive",
          })
        }
      } else {
        // Connect to public relays without extension
        updateAuth("nostr", {
          authenticated: true,
          pubkey: "public-relay-user",
          isDemo: true,
          extension: undefined,
        })

        toast({
          title: "Connected!",
          description: "Connected to Nostr public relays. Install a NIP-07 extension for full functionality.",
        })
      }
    } catch (error) {
      console.error("Nostr connection error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to Nostr",
        variant: "destructive",
      })
    }

    setLoading(null)
  }

  const handleRssConnect = async () => {
    if (!rssUrl) return

    setLoading("rss")

    try {
      const response = await fetch("/api/feeds/rss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedUrl: rssUrl }),
      })

      const data = await response.json()

      if (response.ok) {
        updateAuth("rss", {
          feeds: [...new Set([rssUrl])], // Add to existing feeds, avoid duplicates
        })

        toast({
          title: "Connected!",
          description: `Successfully added ${data.feedType || "feed"}: ${data.feedTitle || rssUrl}`,
        })
        setRssUrl("")
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add feed",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add feed",
        variant: "destructive",
      })
    }

    setLoading(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect Social Networks</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bluesky */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bluesky</CardTitle>
              <CardDescription>Connect via OAuth (secure authentication)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleBlueskyConnect}
                disabled={loading === "bluesky"}
                className="w-full bg-sky-500 hover:bg-sky-600"
              >
                {loading === "bluesky" ? "Connecting..." : "Connect with OAuth"}
              </Button>
            </CardContent>
          </Card>

          {/* Mastodon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mastodon</CardTitle>
              <CardDescription>Connect via OAuth</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="mastodon-instance">Instance</Label>
                <Input
                  id="mastodon-instance"
                  placeholder="mastodon.social"
                  value={mastodonInstance}
                  onChange={(e) => setMastodonInstance(e.target.value)}
                />
              </div>
              <Button
                onClick={handleMastodonConnect}
                disabled={loading === "mastodon"}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                {loading === "mastodon" ? "Connecting..." : "Connect Mastodon"}
              </Button>
            </CardContent>
          </Card>

          {/* Nostr */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Nostr
                {nip07Status.available && (
                  <Badge variant="secondary" className="text-xs">
                    {nip07Status.extension} detected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {nip07Status.available
                  ? `Connect with ${nip07Status.extension} extension for full functionality`
                  : "View public posts or install a NIP-07 extension (Alby, nos2x, etc.)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleNostrConnect}
                disabled={loading === "nostr"}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {loading === "nostr" ? "Connecting..." : "Connect to Nostr"}
              </Button>
              {!nip07Status.available && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Install Alby, nos2x, or another NIP-07 extension for posting and real-time updates
                </p>
              )}
            </CardContent>
          </Card>

          {/* RSS/JSON Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RSS/JSON Feed</CardTitle>
              <CardDescription>Add RSS or JSON feed URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="rss-url">Feed URL</Label>
                <Input
                  id="rss-url"
                  placeholder="https://example.com/feed.xml or feed.json"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleRssConnect}
                disabled={loading === "rss" || !rssUrl}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {loading === "rss" ? "Adding..." : "Add Feed"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
