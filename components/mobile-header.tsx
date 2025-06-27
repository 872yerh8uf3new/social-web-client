"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="bg-slate-900 text-white p-4 flex items-center justify-between">
      <div className="w-8 h-8 bg-white rounded-full"></div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <div className="h-full">
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
