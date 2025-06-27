"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthModal } from "./auth-modal"
import { PostCard } from "./post-card"
import { useAuth } from "./auth-provider"
import { NostrClient, type NostrEvent, getDisplayName, getHandle, formatNostrContent } from "@/lib/nostr"
import { Loader2, Wifi, WifiOff, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

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

export function MainContent() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [nostrClient, setNostrClient] = useState<NostrClient | null>(null)
  const [nostrLoading, setNostrLoading] = useState(false)
  const [nostrError, setNostrError] = useState<string | null>(null)
  const [nostrStatus, setNostrStatus] = useState<{ connected: number; total: number; relays: string[] }>({
    connected: 0,
    total: 0,
    relays: [],
  })
  const { auth, updateAuth } = useAuth()
  const { toast } = useToast()

  const networks = [
    { id: "bluesky", name: "Bluesky", color: "bg-sky-500" },
    { id: "mastodon", name: "Mastodon", color: "bg-purple-500" },
    { id: "nostr", name: "Nostr", color: "bg-orange-500" },
    { id: "rss", name: "RSS", color: "bg-green-500" },
  ]

  const connectedNetworks = [
    ...(auth.bluesky.authenticated ? ["bluesky"] : []),
    ...(auth.mastodon.authenticated ? ["mastodon"] : []),
    ...(auth.nostr.authenticated ? ["nostr"] : []),
    ...(auth.rss.feeds.length > 0 ? ["rss"] : []),
  ]

  // Auto-connect to public Nostr relays on startup
  useEffect(() => {
    if (!auth.nostr.authenticated) {
      console.log("🚀 Auto-connecting to public Nostr relays...")
      updateAuth("nostr", {
        authenticated: true,
        pubkey: "public-relay-user",
        isDemo: true,
        extension: undefined,
      })
    }
  }, [])

  // Handle OAuth callbacks and errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    // Handle OAuth errors
    const error = urlParams.get("error")
    const errorDescription = urlParams.get("error_description")
    const details = urlParams.get("details")

    if (error) {
      let errorMessage = `OAuth Error: ${error}`
      if (errorDescription) errorMessage += ` - ${errorDescription}`
      if (details) errorMessage += ` (${details})`

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      })

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    // Handle Bluesky OAuth callback
    if (urlParams.get("bluesky_auth") === "success") {
      const accessToken = urlParams.get("access_token")
      const handle = urlParams.get("handle")

      if (accessToken && handle) {
        updateAuth("bluesky", {
          authenticated: true,
          handle,
          accessJwt: accessToken,
        })

        toast({
          title: "Connected!",
          description: `Successfully connected to Bluesky as @${handle}`,
        })

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [])

  useEffect(() => {
    if (connectedNetworks.length > 0) {
      fetchPosts()
    }
  }, [auth])

  useEffect(() => {
    // Initialize Nostr client if authenticated
    if (auth.nostr.authenticated && !nostrClient) {
      initializeNostrClient()
    }

    return () => {
      if (nostrClient) {
        nostrClient.disconnect()
      }
    }
  }, [auth.nostr.authenticated])

  // Update Nostr status periodically
  useEffect(() => {
    if (nostrClient) {
      const updateStatus = () => {
        setNostrStatus(nostrClient.getConnectionStatus())
      }

      updateStatus()
      const interval = setInterval(updateStatus, 10000) // Every 10 seconds
      return () => clearInterval(interval)
    }
  }, [nostrClient])

  const initializeNostrClient = async () => {
    setNostrLoading(true)
    setNostrError(null)

    try {
      console.log("🚀 Initializing Nostr client...")
      const client = new NostrClient()

      await client.connect()
      setNostrClient(client)
      setNostrStatus(client.getConnectionStatus())

      console.log("📡 Fetching initial Nostr posts...")
      // Fetch initial public posts
      const events = await client.fetchRecentPosts(30)

      if (events.length === 0) {
        console.warn("No Nostr posts received")
        setNostrError("No posts received from Nostr relays. This might be temporary.")
      } else {
        // Get unique pubkeys for profile fetching
        const pubkeys = [...new Set(events.map((event) => event.pubkey))]
        console.log(`👥 Fetching profiles for ${pubkeys.length} users...`)

        // Fetch profiles for all post authors
        const profiles = await client.fetchProfiles(pubkeys)

        const nostrPosts = events.map((event: NostrEvent) => {
          const profile = profiles.get(event.pubkey)
          return {
            id: event.id,
            author: getDisplayName(profile),
            handle: getHandle(profile),
            content: formatNostrContent(event.content),
            timestamp: new Date(event.created_at * 1000).toISOString(),
            network: "nostr",
            likes: 0,
            reposts: 0,
            replies: 0,
            avatar: profile?.picture,
          }
        })

        console.log(`✅ Loaded ${nostrPosts.length} Nostr posts with profile data`)

        setPosts((prev) => {
          const nonNostrPosts = prev.filter((p) => p.network !== "nostr")
          return [...nostrPosts, ...nonNostrPosts].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
        })

        // Subscribe to real-time updates if user has NIP-07 extension
        if (!auth.nostr.isDemo) {
          console.log("🔴 Starting real-time Nostr subscription...")
          const unsubscribe = client.subscribeToPublicFeed(async (event: NostrEvent) => {
            // Fetch profile for new post author
            const profiles = await client.fetchProfiles([event.pubkey])
            const profile = profiles.get(event.pubkey)

            const nostrPost: Post = {
              id: event.id,
              author: getDisplayName(profile),
              handle: getHandle(profile),
              content: formatNostrContent(event.content),
              timestamp: new Date(event.created_at * 1000).toISOString(),
              network: "nostr",
              likes: 0,
              reposts: 0,
              replies: 0,
              avatar: profile?.picture,
            }

            console.log("📨 New Nostr post received:", nostrPost.content.slice(0, 50) + "...")

            setPosts((prev) => {
              // Avoid duplicates and keep latest 100 posts
              const filtered = prev.filter((p) => p.id !== event.id)
              return [nostrPost, ...filtered].slice(0, 100)
            })
          })

          // Store unsubscribe function for cleanup
          return () => {
            unsubscribe()
          }
        }
      }
    } catch (error) {
      console.error("❌ Failed to initialize Nostr client:", error)
      setNostrError(error instanceof Error ? error.message : "Failed to connect to Nostr relays")
    }
    setNostrLoading(false)
  }

  const retryNostrConnection = () => {
    if (nostrClient) {
      nostrClient.disconnect()
      setNostrClient(null)
    }
    initializeNostrClient()
  }

  const fetchPosts = async () => {
    setLoading(true)
    const allPosts: Post[] = []

    try {
      // Fetch Bluesky posts
      if (auth.bluesky.authenticated && auth.bluesky.accessJwt) {
        try {
          const response = await fetch("/api/feeds/bluesky", {
            headers: {
              Authorization: `Bearer ${auth.bluesky.accessJwt}`,
            },
          })
          if (response.ok) {
            const data = await response.json()
            allPosts.push(...data.posts)
          } else {
            console.error("Bluesky API error:", response.status, await response.text())
          }
        } catch (error) {
          console.error("Failed to fetch Bluesky posts:", error)
        }
      }

      // Fetch Mastodon posts
      if (auth.mastodon.authenticated && auth.mastodon.accessToken) {
        try {
          const response = await fetch("/api/feeds/mastodon", {
            headers: {
              Authorization: `Bearer ${auth.mastodon.accessToken}`,
              "X-Mastodon-Instance": auth.mastodon.instance || "mastodon.social",
            },
          })
          if (response.ok) {
            const data = await response.json()
            allPosts.push(...data.posts)
          }
        } catch (error) {
          console.error("Failed to fetch Mastodon posts:", error)
        }
      }

      // Fetch RSS posts
      if (auth.rss.feeds.length > 0) {
        for (const feedUrl of auth.rss.feeds) {
          try {
            const response = await fetch("/api/feeds/rss", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ feedUrl }),
            })
            if (response.ok) {
              const data = await response.json()
              allPosts.push(...data.posts)
            }
          } catch (error) {
            console.error(`Failed to fetch RSS feed ${feedUrl}:`, error)
          }
        }
      }

      // Refresh Nostr posts if connected
      if (auth.nostr.authenticated && nostrClient && nostrStatus.connected > 0) {
        try {
          console.log("🔄 Refreshing Nostr posts...")
          const events = await nostrClient.fetchRecentPosts(30)

          if (events.length > 0) {
            // Get unique pubkeys for profile fetching
            const pubkeys = [...new Set(events.map((event) => event.pubkey))]
            const profiles = await nostrClient.fetchProfiles(pubkeys)

            const nostrPosts = events.map((event: NostrEvent) => {
              const profile = profiles.get(event.pubkey)
              return {
                id: event.id,
                author: getDisplayName(profile),
                handle: getHandle(profile),
                content: formatNostrContent(event.content),
                timestamp: new Date(event.created_at * 1000).toISOString(),
                network: "nostr",
                likes: 0,
                reposts: 0,
                replies: 0,
                avatar: profile?.picture,
              }
            })
            allPosts.push(...nostrPosts)
          }
        } catch (error) {
          console.error("Failed to fetch Nostr posts:", error)
        }
      }

      // Sort posts by timestamp and update state
      allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // Merge with existing Nostr posts if they exist
      const existingNostrPosts = posts.filter((p) => p.network === "nostr")
      const newNonNostrPosts = allPosts.filter((p) => p.network !== "nostr")

      if (auth.nostr.authenticated && existingNostrPosts.length > 0) {
        const combinedPosts = [
          ...allPosts.filter((p) => p.network === "nostr"),
          ...existingNostrPosts,
          ...newNonNostrPosts,
        ]
        const uniquePosts = combinedPosts.filter(
          (post, index, self) => index === self.findIndex((p) => p.id === post.id),
        )
        uniquePosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setPosts(uniquePosts.slice(0, 100))
      } else {
        setPosts(allPosts)
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error)
    }

    setLoading(false)
  }

  const getPostsByNetwork = (network: string) => {
    return posts.filter((post) => post.network === network)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 to-sky-400 dark:from-slate-800 dark:to-slate-900 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Network Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Networks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {networks.map((network) => (
                <Badge
                  key={network.id}
                  variant={connectedNetworks.includes(network.id) ? "default" : "secondary"}
                  className={`${connectedNetworks.includes(network.id) ? network.color : ""} flex items-center gap-1`}
                >
                  {network.name}
                  {connectedNetworks.includes(network.id) && " ✓"}
                  {network.id === "nostr" && auth.nostr.authenticated && (
                    <>
                      {auth.nostr.isDemo && " (Public)"}
                      {auth.nostr.extension && ` (${auth.nostr.extension})`}
                      {nostrLoading && " (Loading...)"}
                      {!nostrLoading && nostrStatus.connected > 0 && <Wifi className="w-3 h-3 ml-1" />}
                      {!nostrLoading && nostrStatus.connected === 0 && <WifiOff className="w-3 h-3 ml-1" />}
                    </>
                  )}
                </Badge>
              ))}
            </div>

            {/* Nostr Connection Status */}
            {auth.nostr.authenticated && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Nostr: {nostrStatus.connected}/{nostrStatus.total} relays connected
                    </p>
                    {nostrStatus.relays.length > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                        Active: {nostrStatus.relays.join(", ")}
                      </p>
                    )}
                  </div>
                  {nostrStatus.connected === 0 && !nostrLoading && (
                    <Button variant="outline" size="sm" onClick={retryNostrConnection}>
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Nostr Error Alert */}
            {nostrError && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {nostrError}
                  <Button variant="link" className="p-0 h-auto ml-2" onClick={retryNostrConnection}>
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setShowAuthModal(true)}>Connect Networks</Button>
              {connectedNetworks.length > 0 && (
                <Button variant="outline" onClick={fetchPosts} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feed Tabs */}
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="bluesky">Bluesky</TabsTrigger>
            <TabsTrigger value="mastodon">Mastodon</TabsTrigger>
            <TabsTrigger value="nostr">Nostr</TabsTrigger>
            <TabsTrigger value="rss">RSS</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-4">
            {loading || nostrLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={`${post.network}-${post.id}`} post={post} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {connectedNetworks.length === 0
                      ? "Connect to social networks to see your feed"
                      : "No posts found. Try refreshing or check your connections."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {["bluesky", "mastodon", "nostr", "rss"].map((network) => (
            <TabsContent key={network} value={network} className="space-y-4">
              {loading || (network === "nostr" && nostrLoading) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {getPostsByNetwork(network).map((post) => (
                    <PostCard key={`${post.network}-${post.id}`} post={post} />
                  ))}
                  {getPostsByNetwork(network).length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">
                          {connectedNetworks.includes(network)
                            ? `No ${network} posts found`
                            : `Connect to ${network} to see posts`}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </div>
    </div>
  )
}
