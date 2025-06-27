"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface AuthState {
  bluesky: { authenticated: boolean; handle?: string; accessJwt?: string }
  mastodon: { authenticated: boolean; handle?: string; accessToken?: string; instance?: string }
  nostr: { authenticated: boolean; pubkey?: string; isDemo?: boolean; extension?: string }
  rss: { feeds: string[] }
}

interface AuthContextType {
  auth: AuthState
  updateAuth: (network: keyof AuthState, data: any) => void
  logout: (network: keyof AuthState) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    bluesky: { authenticated: false },
    mastodon: { authenticated: false },
    nostr: { authenticated: false },
    rss: { feeds: [] },
  })

  useEffect(() => {
    // Load auth state from localStorage
    const savedAuth = localStorage.getItem("social-auth")
    if (savedAuth) {
      try {
        setAuth(JSON.parse(savedAuth))
      } catch (error) {
        console.error("Failed to parse saved auth:", error)
      }
    }
  }, [])

  const updateAuth = (network: keyof AuthState, data: any) => {
    const newAuth = { ...auth, [network]: { ...auth[network], ...data } }
    setAuth(newAuth)
    localStorage.setItem("social-auth", JSON.stringify(newAuth))
  }

  const logout = (network: keyof AuthState) => {
    const newAuth = { ...auth }
    if (network === "rss") {
      newAuth[network] = { feeds: [] }
    } else {
      newAuth[network] = { authenticated: false }
    }
    setAuth(newAuth)
    localStorage.setItem("social-auth", JSON.stringify(newAuth))
  }

  return <AuthContext.Provider value={{ auth, updateAuth, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
