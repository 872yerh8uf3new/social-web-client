"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "./auth-provider"
import { PostCard } from "./post-card"
import { RichText } from "./rich-text"
import { Settings, Calendar, MapPin, LinkIcon, Zap } from "lucide-react"

interface UserProfile {
  handle: string
  displayName: string
  description: string
  avatar?: string
  banner?: string
  followersCount: number
  followsCount: number
  postsCount: number
  createdAt?: string
  location?: string
  website?: string
  nip05?: string
  lud16?: string
}

interface UserPost {
  id: string
  content: string
  timestamp: string
  likes: number
  reposts: number
  replies: number
  images?: string[]
}

export function ProfileContent() {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [posts, setPosts] = useState<Record<string, UserPost[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("overview")
  const { auth } = useAuth()

  const connectedNetworks = [
    ...(auth.bluesky.authenticated ? ["bluesky"] : []),
    ...(auth.mastodon.authenticated ? ["mastodon"] : []),
    ...(auth.nostr.authenticated ? ["nostr"] : []),
  ]

  useEffect(() => {
    fetchUserData()
  }, [auth])

  const fetchUserData = async () => {
    // Fetch Bluesky profile
    if (auth.bluesky.authenticated && auth.bluesky.accessJwt) {
      setLoading((prev) => ({ ...prev, bluesky: true }))
      try {
        const response = await fetch("/api/user/bluesky", {
          headers: {
            Authorization: `Bearer ${auth.bluesky.accessJwt}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setProfiles((prev) => ({ ...prev, bluesky: data.profile }))
          setPosts((prev) => ({ ...prev, bluesky: data.posts }))
        }
      } catch (error) {
        console.error("Failed to fetch Bluesky profile:", error)
      }
      setLoading((prev) => ({ ...prev, bluesky: false }))
    }

    // Fetch Mastodon profile
    if (auth.mastodon.authenticated && auth.mastodon.accessToken) {
      setLoading((prev) => ({ ...prev, mastodon: true }))
      try {
        const response = await fetch("/api/user/mastodon", {
          headers: {
            Authorization: `Bearer ${auth.mastodon.accessToken}`,
            "X-Mastodon-Instance": auth.mastodon.instance || "mastodon.social",
          },
        })
        if (response.ok) {
          const data = await response.json()
          setProfiles((prev) => ({ ...prev, mastodon: data.profile }))
          setPosts((prev) => ({ ...prev, mastodon: data.posts }))
        }
      } catch (error) {
        console.error("Failed to fetch Mastodon profile:", error)
      }
      setLoading((prev) => ({ ...prev, mastodon: false }))
    }

    // Enhanced Nostr profile with real data
    if (auth.nostr.authenticated) {
      setLoading((prev) => ({ ...prev, nostr: true }))
      try {
        // For demo mode, create a mock profile
        if (auth.nostr.isDemo) {
          setProfiles((prev) => ({
            ...prev,
            nostr: {
              handle: "npub1public...",
              displayName: "Public Relay User",
              description: "Viewing public Nostr content without extension",
              followersCount: 0,
              followsCount: 0,
              postsCount: 0,
            },
          }))
        } else if (auth.nostr.pubkey && auth.nostr.pubkey !== "public-relay-user") {
          // For authenticated users, try to get their profile from Nostr
          // This would require the NostrClient to be available here
          // For now, create a basic profile
          setProfiles((prev) => ({
            ...prev,
            nostr: {
              handle: `npub1${auth.nostr.pubkey?.slice(0, 8)}...`,
              displayName: "Nostr User",
              description: "Connected via " + (auth.nostr.extension || "NIP-07 extension"),
              followersCount: 0,
              followsCount: 0,
              postsCount: 0,
            },
          }))
        }
        setPosts((prev) => ({ ...prev, nostr: [] }))
      } catch (error) {
        console.error("Failed to setup Nostr profile:", error)
      }
      setLoading((prev) => ({ ...prev, nostr: false }))
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const ProfileSkeleton = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const NetworkProfile = ({ network, profile }: { network: string; profile: UserProfile }) => (
    <Card>
      <CardContent className="p-6">
        {/* Banner */}
        {profile.banner && (
          <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
            <img
              src={profile.banner || "/placeholder.svg"}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
            {profile.avatar ? (
              <img
                src={profile.avatar || "/placeholder.svg"}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">{profile.displayName}</h2>
              <Badge variant="secondary" className="capitalize">
                {network}
              </Badge>
              {network === "nostr" && auth.nostr.extension && (
                <Badge variant="outline" className="text-xs">
                  {auth.nostr.extension}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mb-2">{profile.handle}</p>
            {profile.description && (
              <div className="text-sm mb-4">
                <RichText content={profile.description} network={network} />
              </div>
            )}

            {/* Profile metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              {profile.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(profile.createdAt)}
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
              {profile.nip05 && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    ✓ {profile.nip05}
                  </Badge>
                </div>
              )}
              {profile.lud16 && (
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs">{profile.lud16}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-semibold text-lg">{formatNumber(profile.postsCount)}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div>
                <div className="font-semibold text-lg">{formatNumber(profile.followersCount)}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </div>
              <div>
                <div className="font-semibold text-lg">{formatNumber(profile.followsCount)}</div>
                <div className="text-xs text-muted-foreground">Following</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 to-sky-400 dark:from-slate-800 dark:to-slate-900 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Network Profiles */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bluesky" disabled={!auth.bluesky.authenticated}>
              Bluesky
            </TabsTrigger>
            <TabsTrigger value="mastodon" disabled={!auth.mastodon.authenticated}>
              Mastodon
            </TabsTrigger>
            <TabsTrigger value="nostr" disabled={!auth.nostr.authenticated}>
              Nostr
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {connectedNetworks.map((network) => (
                <div key={network}>
                  {loading[network] ? (
                    <ProfileSkeleton />
                  ) : profiles[network] ? (
                    <NetworkProfile network={network} profile={profiles[network]} />
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">Failed to load {network} profile</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
              {connectedNetworks.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Connect to social networks to see your profiles</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {["bluesky", "mastodon", "nostr"].map((network) => (
            <TabsContent key={network} value={network} className="space-y-4">
              {loading[network] ? (
                <ProfileSkeleton />
              ) : profiles[network] ? (
                <>
                  <NetworkProfile network={network} profile={profiles[network]} />

                  {/* User's Posts */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Posts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {posts[network] && posts[network].length > 0 ? (
                        <div className="space-y-4">
                          {posts[network].map((post) => (
                            <PostCard
                              key={post.id}
                              post={{
                                ...post,
                                author: profiles[network].displayName,
                                handle: profiles[network].handle,
                                network,
                                avatar: profiles[network].avatar,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-2">No posts found</p>
                          {network === "nostr" && auth.nostr.isDemo && (
                            <p className="text-xs text-muted-foreground">
                              Install a NIP-07 extension to view and post your own content
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {auth[network as keyof typeof auth]?.authenticated
                        ? `Failed to load ${network} profile`
                        : `Connect to ${network} to see your profile`}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
