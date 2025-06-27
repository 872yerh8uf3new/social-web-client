import { Sidebar } from "@/components/sidebar"
import { ClipsContent } from "@/components/clips-content"
import { MobileHeader } from "@/components/mobile-header"

export default function ClipsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden">
        <MobileHeader />
      </div>

      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <div className="flex-1 lg:ml-64">
          <ClipsContent />
        </div>
      </div>
    </div>
  )
}
