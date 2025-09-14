export type UserRole = "superadmin" | "user"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}


export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include"
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Login failed")
    }
    return res.json()
  },

  logout: async (): Promise<void> => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      if (!res.ok) return null
      const data = await res.json()
      return data.user || null
    } catch {
      return null
    }
  },

  hasRole: (user: User | null, role: UserRole): boolean => {
    if (!user) return false
    if (role === "superadmin") return user.role === "superadmin"
    return user.role === "superadmin" || user.role === role
  },

  canManageUsers: (user: User | null): boolean => {
    return user?.role === "superadmin"
  },

  canManageProducts: (user: User | null): boolean => {
    return user?.role === "superadmin"
  },

  canManageClients: (user: User | null): boolean => {
    return user !== null // Both roles can manage clients
  },

  canManageInvoices: (user: User | null): boolean => {
    return user !== null // Both roles can manage invoices
  },
}
