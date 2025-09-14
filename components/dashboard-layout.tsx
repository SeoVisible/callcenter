"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Users, Package, FileText, UserCheck, LogOut, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: FileText, roles: ["superadmin", "user"] },
    { id: "users", label: "User Management", icon: Users, roles: ["superadmin", "user"] },
    { id: "products", label: "Products", icon: Package, roles: ["superadmin", "user"] },
    { id: "clients", label: "Clients", icon: UserCheck, roles: ["superadmin", "user"] },
    { id: "invoices", label: "Invoices", icon: FileText, roles: ["superadmin", "user"] },
  ]

  const availableItems = navigationItems.filter((item) => item.roles.includes(user?.role || "user"))

  const handleLogout = async () => {
    await logout()
  }
// console.log(user);
  return (
  <div className="min-h-screen bg-[#f5f7fc]">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[280px] bg-white border-r border-[#e5e8f0] transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-[#e5e8f0]">
            <h1 className="text-xl font-bold text-[#37445c]">
              <img 
                src="/nifar_logo.jpg" 
                alt="Pro Arbeitsschutz Logo" 
                style={{ height: '110px', objectFit: 'cover', width: '100%' }}
              />
            </h1>
            <p className="text-sm text-[#bfc8dc] mt-1">
              {user?.name} ({user?.role})
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {availableItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start rounded-xl px-4 py-2 text-base font-medium transition-all group",
                    isActive
                      ? "bg-[#f5f7fc] text-[#ff1901] shadow-none"
                      : "text-[#37445c] hover:bg-[#f5f7fc] hover:text-[#ff1901] focus:bg-[#f5f7fc] focus:text-[#ff1901]"
                  )}
                  style={{}}
                  onClick={() => {
                    onSectionChange?.(item.id)
                    setSidebarOpen(false)
                  }}
                >
                  <Icon className={cn("mr-2 h-5 w-5 transition-colors", isActive ? "text-[#ff1901]" : "group-hover:text-[#ff1901] group-focus:text-[#ff1901]")} />
                  {item.label}
                </Button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[#e5e8f0]">
            <Button variant="outline" className="w-full justify-start bg-transparent text-[#37445c]" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-8 bg-[#f5f7fc] min-h-screen">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
