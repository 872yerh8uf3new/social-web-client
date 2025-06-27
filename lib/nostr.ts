"use client"

export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export interface NostrFilter {
  kinds?: number[]
  authors?: string[]
  since?: number
  until?: number
  limit?: number
  "#t"?: string[]
}

export interface NostrProfile {
  pubkey: string
  name?: string
  display_name?: string
  about?: string
  picture?: string
  banner?: string
  website?: string
  nip05?: string
  lud16?: string
  created_at?: number
}

// Extend window interface for NIP-07
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>
      signEvent(event: any): Promise<NostrEvent>
      getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>
        decrypt(pubkey: string, ciphertext: string): Promise<string>
      }
    }
  }
}

export class NostrClient {
  // Updated with more reliable relays
  private relays: string[] = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.snort.social",
    "wss://nostr.wine",
    "wss://relay.nostr.bg",
    "wss://nostr.mom",
    "wss://relay.current.fyi",
    "wss://nostr-pub.wellorder.net",
  ]
  private connections: Map<string, WebSocket> = new Map()
  private subscriptions: Map<string, (event: NostrEvent) => void> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private maxReconnectAttempts = 2
  private connectionTimeout = 8000 // 8 seconds
  private minSuccessfulConnections = 2
  private profileCache: Map<string, NostrProfile> = new Map()

  async connect(): Promise<void> {
    console.log("🔌 Connecting to Nostr relays...")

    // Try to connect to all relays concurrently
    const connectionPromises = this.relays.map((relay) =>
      this.connectToRelay(relay).catch((error) => {
        console.warn(`Failed to connect to ${relay}:`, error.message)
        return null
      }),
    )

    const results = await Promise.allSettled(connectionPromises)
    const successful = results.filter((r) => r.status === "fulfilled" && r.value !== null).length

    console.log(`✅ Connected to ${successful}/${this.relays.length} Nostr relays`)

    if (successful < this.minSuccessfulConnections) {
      console.warn(`⚠️ Only ${successful} relays connected, but continuing anyway`)
    }

    if (successful === 0) {
      throw new Error("Failed to connect to any Nostr relays")
    }

    // Wait a moment for connections to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  private connectToRelay(relay: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔗 Connecting to ${relay}`)
        const ws = new WebSocket(relay)
        let resolved = false

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true
            ws.close()
            reject(new Error(`Connection timeout (${this.connectionTimeout}ms)`))
          }
        }, this.connectionTimeout)

        ws.onopen = () => {
          console.log(`✅ Connected to ${relay}`)
          this.connections.set(relay, ws)
          this.reconnectAttempts.set(relay, 0)
          clearTimeout(timeout)
          if (!resolved) {
            resolved = true
            resolve(ws)
          }
        }

        ws.onerror = (error) => {
          clearTimeout(timeout)
          if (!resolved) {
            resolved = true
            reject(new Error(`Connection failed`))
          }
        }

        ws.onclose = (event) => {
          console.log(`🔌 Disconnected from ${relay} (${event.code}: ${event.reason || "Unknown"})`)
          this.connections.delete(relay)

          // Only attempt reconnect for unexpected closures
          if (event.code !== 1000 && event.code !== 1001 && !resolved) {
            this.attemptReconnect(relay)
          }
        }

        ws.onmessage = (message) => {
          try {
            const data = JSON.parse(message.data)
            this.handleMessage(data)
          } catch (error) {
            console.warn(`Invalid JSON from ${relay}:`, error)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private attemptReconnect(relay: string) {
    const attempts = this.reconnectAttempts.get(relay) || 0
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(relay, attempts + 1)
      const delay = Math.min(Math.pow(2, attempts) * 1000, 10000) // Max 10 seconds

      console.log(`🔄 Reconnecting to ${relay} in ${delay}ms (${attempts + 1}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connectToRelay(relay).catch((error) => {
          console.warn(`Reconnection failed for ${relay}:`, error.message)
        })
      }, delay)
    }
  }

  private handleMessage(data: any[]) {
    if (!Array.isArray(data) || data.length < 2) {
      return
    }

    const [type, subscriptionId, event] = data

    switch (type) {
      case "EVENT":
        if (event && this.isValidEvent(event)) {
          // Cache profile metadata (kind 0)
          if (event.kind === 0) {
            this.cacheProfile(event)
          }

          const callback = this.subscriptions.get(subscriptionId)
          if (callback) {
            callback(event)
          }
        }
        break
      case "EOSE":
        console.log(`📥 End of stored events for subscription ${subscriptionId}`)
        break
      case "NOTICE":
        console.log(`📢 Relay notice: ${data[1]}`)
        break
      case "OK":
        console.log(`✅ Event accepted: ${data[1]}`)
        break
      default:
        // Ignore unknown message types
        break
    }
  }

  private cacheProfile(event: NostrEvent) {
    try {
      const profileData = JSON.parse(event.content)
      const profile: NostrProfile = {
        pubkey: event.pubkey,
        name: profileData.name,
        display_name: profileData.display_name,
        about: profileData.about,
        picture: profileData.picture,
        banner: profileData.banner,
        website: profileData.website,
        nip05: profileData.nip05,
        lud16: profileData.lud16,
        created_at: event.created_at,
      }

      this.profileCache.set(event.pubkey, profile)
      console.log(`👤 Cached profile for ${profile.name || profile.display_name || npubEncode(event.pubkey)}`)
    } catch (error) {
      console.warn("Failed to parse profile data:", error)
    }
  }

  private isValidEvent(event: any): boolean {
    return (
      event &&
      typeof event.id === "string" &&
      typeof event.pubkey === "string" &&
      typeof event.created_at === "number" &&
      typeof event.kind === "number" &&
      Array.isArray(event.tags) &&
      typeof event.content === "string" &&
      typeof event.sig === "string" &&
      (event.kind === 0 || (event.content.length > 0 && event.content.length < 2000)) // Allow empty content for metadata
    )
  }

  async checkNIP07(): Promise<{ available: boolean; extension?: string }> {
    if (typeof window === "undefined") {
      return { available: false }
    }

    // Wait for extensions to load
    await new Promise((resolve) => setTimeout(resolve, 200))

    const extensions = [
      { name: "Alby", check: () => window.nostr && (window as any).alby },
      { name: "nos2x", check: () => window.nostr && (window as any).nos2x },
      { name: "Flamingo", check: () => window.nostr && (window as any).flamingo },
      { name: "Generic NIP-07", check: () => window.nostr },
    ]

    for (const ext of extensions) {
      try {
        if (ext.check()) {
          return { available: true, extension: ext.name }
        }
      } catch (error) {
        console.warn(`Error checking ${ext.name}:`, error)
      }
    }

    return { available: false }
  }

  async getPublicKey(): Promise<string> {
    const nip07 = await this.checkNIP07()
    if (!nip07.available || !window.nostr) {
      throw new Error("NIP-07 extension not available")
    }

    try {
      const pubkey = await window.nostr.getPublicKey()
      console.log(`🔑 Got public key from ${nip07.extension}: ${pubkey.slice(0, 8)}...`)
      return pubkey
    } catch (error) {
      console.error("Failed to get public key:", error)
      throw new Error("Failed to get public key from extension")
    }
  }

  async signEvent(event: Partial<NostrEvent>): Promise<NostrEvent> {
    const nip07 = await this.checkNIP07()
    if (!nip07.available || !window.nostr) {
      throw new Error("NIP-07 extension not available")
    }

    try {
      const signedEvent = await window.nostr.signEvent(event)
      console.log(`✍️ Signed event with ${nip07.extension}`)
      return signedEvent
    } catch (error) {
      console.error("Failed to sign event:", error)
      throw new Error("Failed to sign event with extension")
    }
  }

  async fetchProfiles(pubkeys: string[]): Promise<Map<string, NostrProfile>> {
    if (pubkeys.length === 0) return new Map()

    // Check cache first
    const uncachedPubkeys = pubkeys.filter((pubkey) => !this.profileCache.has(pubkey))

    if (uncachedPubkeys.length > 0) {
      console.log(`🔍 Fetching profiles for ${uncachedPubkeys.length} users...`)

      const connectedRelays = Array.from(this.connections.entries()).filter(
        ([_, ws]) => ws.readyState === WebSocket.OPEN,
      )

      if (connectedRelays.length === 0) {
        console.warn("No connected relays for fetching profiles")
        return new Map(
          pubkeys.map((pubkey) => [pubkey, this.profileCache.get(pubkey)]).filter(([_, profile]) => profile) as [
            string,
            NostrProfile,
          ][],
        )
      }

      return new Promise((resolve) => {
        const subscriptionId = `profiles_${Math.random().toString(36).substring(7)}`
        const profiles = new Map<string, NostrProfile>()

        // Add cached profiles
        pubkeys.forEach((pubkey) => {
          const cached = this.profileCache.get(pubkey)
          if (cached) {
            profiles.set(pubkey, cached)
          }
        })

        const filter: NostrFilter = {
          kinds: [0], // Profile metadata
          authors: uncachedPubkeys,
        }

        const subscription = ["REQ", subscriptionId, filter]

        // Set up temporary callback
        this.subscriptions.set(subscriptionId, (event: NostrEvent) => {
          if (event.kind === 0) {
            try {
              const profileData = JSON.parse(event.content)
              const profile: NostrProfile = {
                pubkey: event.pubkey,
                name: profileData.name,
                display_name: profileData.display_name,
                about: profileData.about,
                picture: profileData.picture,
                banner: profileData.banner,
                website: profileData.website,
                nip05: profileData.nip05,
                lud16: profileData.lud16,
                created_at: event.created_at,
              }

              profiles.set(event.pubkey, profile)
              this.profileCache.set(event.pubkey, profile)
            } catch (error) {
              console.warn("Failed to parse profile data:", error)
            }
          }
        })

        // Send to connected relays
        let sentCount = 0
        connectedRelays.forEach(([relay, ws]) => {
          try {
            ws.send(JSON.stringify(subscription))
            sentCount++
          } catch (error) {
            console.warn(`Failed to send profile request to ${relay}:`, error)
          }
        })

        console.log(`📤 Sent profile request to ${sentCount} relays`)

        // Collect profiles for 3 seconds, then resolve
        setTimeout(() => {
          // Close subscription
          const closeSubscription = ["CLOSE", subscriptionId]
          connectedRelays.forEach(([_, ws]) => {
            try {
              ws.send(JSON.stringify(closeSubscription))
            } catch (error) {
              console.warn("Failed to close profile subscription:", error)
            }
          })
          this.subscriptions.delete(subscriptionId)

          console.log(
            `👥 Fetched ${profiles.size} profiles (${profiles.size - (pubkeys.length - uncachedPubkeys.length)} new)`,
          )
          resolve(profiles)
        }, 3000)
      })
    }

    // Return cached profiles
    const result = new Map<string, NostrProfile>()
    pubkeys.forEach((pubkey) => {
      const cached = this.profileCache.get(pubkey)
      if (cached) {
        result.set(pubkey, cached)
      }
    })

    return result
  }

  getProfile(pubkey: string): NostrProfile | undefined {
    return this.profileCache.get(pubkey)
  }

  subscribeToPublicFeed(callback: (event: NostrEvent) => void): () => void {
    const subscriptionId = `feed_${Math.random().toString(36).substring(7)}`
    console.log(`📡 Starting public feed subscription: ${subscriptionId}`)

    // Subscribe to recent public posts with better filtering
    const filter: NostrFilter = {
      kinds: [1], // Text notes only
      limit: 100,
      since: Math.floor(Date.now() / 1000) - 3600, // Last hour for real-time
    }

    const subscription = ["REQ", subscriptionId, filter]
    this.subscriptions.set(subscriptionId, (event) => {
      // Additional client-side filtering
      if (this.isGoodContent(event.content)) {
        callback(event)
      }
    })

    // Send subscription to connected relays
    let sentCount = 0
    this.connections.forEach((ws, relay) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(subscription))
          sentCount++
        } catch (error) {
          console.warn(`Failed to send subscription to ${relay}:`, error)
        }
      }
    })

    console.log(`📤 Sent subscription to ${sentCount} relays`)

    // Return unsubscribe function
    return () => {
      console.log(`🛑 Closing subscription: ${subscriptionId}`)
      const closeSubscription = ["CLOSE", subscriptionId]
      this.connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(closeSubscription))
          } catch (error) {
            console.warn("Failed to close subscription:", error)
          }
        }
      })
      this.subscriptions.delete(subscriptionId)
    }
  }

  async fetchRecentPosts(limit = 50): Promise<NostrEvent[]> {
    const connectedRelays = Array.from(this.connections.entries()).filter(([_, ws]) => ws.readyState === WebSocket.OPEN)

    if (connectedRelays.length === 0) {
      console.warn("No connected relays for fetching posts")
      return []
    }

    return new Promise((resolve) => {
      const events: NostrEvent[] = []
      const subscriptionId = `fetch_${Math.random().toString(36).substring(7)}`
      console.log(`🔍 Fetching recent posts: ${subscriptionId}`)

      const filter: NostrFilter = {
        kinds: [1], // Text notes
        limit: Math.min(limit * 2, 200), // Fetch more to account for filtering
        since: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
      }

      const subscription = ["REQ", subscriptionId, filter]

      // Set up temporary callback with filtering
      this.subscriptions.set(subscriptionId, (event: NostrEvent) => {
        if (this.isGoodContent(event.content)) {
          events.push(event)
        }
      })

      // Send to connected relays
      let sentCount = 0
      connectedRelays.forEach(([relay, ws]) => {
        try {
          ws.send(JSON.stringify(subscription))
          sentCount++
        } catch (error) {
          console.warn(`Failed to send fetch request to ${relay}:`, error)
        }
      })

      console.log(`📤 Sent fetch request to ${sentCount} relays`)

      // Collect events for 6 seconds, then resolve
      setTimeout(() => {
        // Close subscription
        const closeSubscription = ["CLOSE", subscriptionId]
        connectedRelays.forEach(([_, ws]) => {
          try {
            ws.send(JSON.stringify(closeSubscription))
          } catch (error) {
            console.warn("Failed to close fetch subscription:", error)
          }
        })
        this.subscriptions.delete(subscriptionId)

        // Remove duplicates and sort
        const uniqueEvents = events.filter((event, index, self) => index === self.findIndex((e) => e.id === event.id))

        uniqueEvents.sort((a, b) => b.created_at - a.created_at)
        const result = uniqueEvents.slice(0, limit)
        console.log(`📥 Fetched ${result.length} unique posts from ${events.length} total`)
        resolve(result)
      }, 6000)
    })
  }

  private isGoodContent(content: string): boolean {
    if (!content || typeof content !== "string") return false

    const trimmed = content.trim()

    // Length checks
    if (trimmed.length < 10 || trimmed.length > 1000) return false

    // Filter out common spam patterns
    const spamPatterns = [
      /^test\s*$/i,
      /^testing\s*$/i,
      /^gm\s*$/i,
      /^hello\s*$/i,
      /🤖/,
      /test test test/i,
      /^\d+$/,
      /^[.]+$/,
      /^[!]+$/,
      /bitcoin.*price/i,
      /follow.*back/i,
      /check.*out.*link/i,
    ]

    return !spamPatterns.some((pattern) => pattern.test(trimmed))
  }

  getConnectionStatus(): { connected: number; total: number; relays: string[] } {
    const connected = Array.from(this.connections.entries()).filter(([_, ws]) => ws.readyState === WebSocket.OPEN)

    return {
      connected: connected.length,
      total: this.relays.length,
      relays: connected.map(([relay]) => new URL(relay).hostname),
    }
  }

  disconnect(): void {
    console.log("🔌 Disconnecting from all Nostr relays")
    this.connections.forEach((ws, relay) => {
      try {
        ws.close(1000, "Client disconnect")
      } catch (error) {
        console.warn(`Error closing connection to ${relay}:`, error)
      }
    })
    this.connections.clear()
    this.subscriptions.clear()
    this.reconnectAttempts.clear()
    this.profileCache.clear()
  }
}

// Utility functions for Nostr
export function npubEncode(pubkey: string): string {
  if (!pubkey || pubkey.length < 8) return "npub1unknown"
  return `npub1${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`
}

export function formatNostrContent(content: string): string {
  if (!content) return ""

  return content
    .replace(/nostr:/g, "")
    .replace(/#\[(\d+)\]/g, "") // Remove mention tags
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
    .replace(/https?:\/\/[^\s]+/g, (url) => url) // Keep URLs as-is
    .trim()
}

export function getDisplayName(profile?: NostrProfile): string {
  if (!profile) return "Anonymous"
  return profile.display_name || profile.name || npubEncode(profile.pubkey)
}

export function getHandle(profile?: NostrProfile): string {
  if (!profile) return "npub1unknown"
  if (profile.nip05) {
    return `@${profile.nip05}`
  }
  return npubEncode(profile.pubkey)
}

// Check if NIP-07 is available (can be called from components)
export async function checkNIP07Support(): Promise<{ available: boolean; extension?: string }> {
  if (typeof window === "undefined") {
    return { available: false }
  }

  // Wait for extensions to load
  await new Promise((resolve) => setTimeout(resolve, 300))

  const extensions = [
    { name: "Alby", check: () => window.nostr && (window as any).alby },
    { name: "nos2x", check: () => window.nostr && (window as any).nos2x },
    { name: "Flamingo", check: () => window.nostr && (window as any).flamingo },
    { name: "Generic NIP-07", check: () => window.nostr },
  ]

  for (const ext of extensions) {
    try {
      if (ext.check()) {
        return { available: true, extension: ext.name }
      }
    } catch (error) {
      console.warn(`Error checking ${ext.name}:`, error)
    }
  }

  return { available: false }
}
