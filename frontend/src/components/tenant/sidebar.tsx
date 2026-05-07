"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  CreditCard, 
  History, 
  RefreshCw, 
  Wrench, 
  FileText, 
  Files, 
  MessageSquare, 
  Megaphone, 
  User,
  LogOut,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { useAuth } from "@/context/auth-context"

const items = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/tenant/dashboard" },
  { title: "Pay Rent", icon: CreditCard, href: "/tenant/pay-rent" },
  { title: "Payments", icon: History, href: "/tenant/payments" },
  { title: "Auto-Pay", icon: RefreshCw, href: "/tenant/autopay" },
  { title: "Maintenance", icon: Wrench, href: "/tenant/maintenance" },
  { title: "Lease", icon: FileText, href: "/tenant/lease" },
  { title: "Documents", icon: Files, href: "/tenant/documents" },
  { title: "Messages", icon: MessageSquare, href: "/tenant/messages" },
  { title: "Announcements", icon: Megaphone, href: "/tenant/announcements" },
  { title: "Profile", icon: User, href: "/tenant/profile" },
]

export function TenantSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initials = user?.email?.substring(0, 2).toUpperCase() || "RE"

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-72 transition-all">
      <div className="p-8">
        <Logo className="h-10 w-auto" />
      </div>

      <div className="px-4 py-2 flex-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 ml-4 font-heading">
          Tenant Portal
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative",
                  isActive
                    ? "text-primary-foreground bg-primary shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className="flex-1 font-heading">{item.title}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 opacity-50" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="p-3 bg-secondary/50 rounded-2xl border border-border group hover:border-accent/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm font-heading shadow-md shadow-primary/20">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-foreground truncate font-heading">{user?.email?.split('@')[0] || "Resident"}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest font-bold font-heading">Tenant Account</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
