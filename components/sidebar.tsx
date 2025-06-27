"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import {
  Home,
  Bell,
  User,
  Gamepad2,
  Video,
  List,
  MessageCircle,
  Settings,
  Info,
  FileText,
  Shield,
  Code,
} from "lucide-react"

const mainNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/mini-apps", label: "Mini Apps", icon: Gamepad2 },
  { href: "/clips", label: "Clips", icon: Video },
  { href: "/lists", label: "Lists", icon: List },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings },
]

const footerNavItems = [
  { href: "/about", label: "About", icon: Info },
  { href: "/tos", label: "TOS", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/source", label: "Source Code", icon: Code },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col border-r border-slate-800">
      {/* Logo/Brand */}
      <div className="p-6 flex items-center justify-between">
        <div className="w-8 h-8 bg-white rounded-full"></div>
        <ThemeToggle />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-slate-800 dark:bg-slate-800 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-800",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer Navigation */}
      <div className="p-4 border-t border-slate-800">
        <ul className="space-y-2">
          {footerNavItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-slate-800 dark:bg-slate-800 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-800",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
