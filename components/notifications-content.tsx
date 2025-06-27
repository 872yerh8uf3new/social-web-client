"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, MessageCircle, Repeat2, UserPlus } from "lucide-react"

export function NotificationsContent() {
  const notifications = [
    {
      id: "",
      type: "",
      user: "",
      handle: "",
      content: "",
      timestamp: "",
      network: "",
      read: true,
    },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />
      case "reply":
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case "repost":
        return <Repeat2 className="w-4 h-4 text-green-500" />
      case "follow":
        return <UserPlus className="w-4 h-4 text-purple-500" />
      default:
        return null
    }
  }

  const networkColors = {
    bluesky: "bg-sky-500",
    mastodon: "bg-purple-500",
    nostr: "bg-orange-500",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 to-sky-400 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Mark All Read
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="likes">Likes</TabsTrigger>
            <TabsTrigger value="replies">Replies</TabsTrigger>
            <TabsTrigger value="reposts">Reposts</TabsTrigger>
            <TabsTrigger value="follows">Follows</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {notifications.map((notification) => (
              <Card key={notification.id} className={`${!notification.read ? "ring-2 ring-blue-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getIcon(notification.type)}
                        <span className="font-semibold text-sm">{notification.user}</span>
                        <span className="text-slate-500 text-sm">{notification.handle}</span>
                        <span className="text-slate-500 text-sm">·</span>
                        <span className="text-slate-500 text-sm">{notification.timestamp}</span>
                        <Badge
                          className={`ml-auto text-xs ${networkColors[notification.network as keyof typeof networkColors]} text-white`}
                        >
                          {notification.network}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{notification.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {["likes", "replies", "reposts", "follows"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-3">
              {notifications
                .filter(
                  (n) =>
                    n.type === type.slice(0, -1) ||
                    (type === "reposts" && n.type === "repost") ||
                    (type === "follows" && n.type === "follow"),
                )
                .map((notification) => (
                  <Card key={notification.id} className={`${!notification.read ? "ring-2 ring-blue-200" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getIcon(notification.type)}
                            <span className="font-semibold text-sm">{notification.user}</span>
                            <span className="text-slate-500 text-sm">{notification.handle}</span>
                            <span className="text-slate-500 text-sm">·</span>
                            <span className="text-slate-500 text-sm">{notification.timestamp}</span>
                            <Badge
                              className={`ml-auto text-xs ${networkColors[notification.network as keyof typeof networkColors]} text-white`}
                            >
                              {notification.network}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{notification.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
