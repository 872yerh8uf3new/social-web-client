"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Play, Star } from "lucide-react"

export function MiniAppsContent() {
  const miniApps = [
    {
      id: "1",
      url: "https://yoyle.city/hangman",
      name: "Hangman",
      description: "Classic word-guessing game",
      category: "Games",
      rating: 4.8,
      installs: "12K+",
      icon: "🤔",
      featured: true,
    },
  ]

  const categories = [
    "All",
    "Analytics",
    "Productivity",
    "Tools",
    "Communication",
    "Organization",
    "Wellness",
    "Games"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 to-sky-400 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Mini Apps</h1>
          <p className="text-white/80">Enhance your social experience with HTML5 mini applications</p>
        </div>

        {/* Featured Apps */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Featured Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {miniApps
              .filter((app) => app.featured)
              .map((app) => (
                <Card key={app.id} className="relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500 text-yellow-900">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{app.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Badge variant="secondary">{app.category}</Badge>
                          <span>★ {app.rating}</span>
                          <span>·</span>
                          <span>{app.installs}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">{app.description}</p>
                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <a href={app.url} target="_blank" rel="noopener noreferrer">
                          <Play className="w-4 h-4 mr-2" />
                          Launch App
                        </a>
                      </Button>
                      <Button variant="outline" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* All Apps */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">All Apps</h2>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {miniApps.map((app) => (
              <Card key={app.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{app.icon}</div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{app.name}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Badge variant="secondary" className="text-xs">
                          {app.category}
                        </Badge>
                        <span>★ {app.rating}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{app.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{app.installs} installs</span>
                    <Button asChild size="sm">
                      <a href={app.url} target="_blank" rel="noopener noreferrer">
                        <Play className="w-3 h-3 mr-1" />
                        Launch
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
