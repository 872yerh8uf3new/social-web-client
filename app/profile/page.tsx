import { Sidebar } from "@/components/sidebar"
import { ProfileContent } from "@/components/profile-content"
import { MobileHeader } from "@/components/mobile-header"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader />
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          <ProfileContent />
        </div>
      </div>
    </div>
  )
}
