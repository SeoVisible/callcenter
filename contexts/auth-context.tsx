"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type AuthState, authService } from "@/lib/auth"

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    (async () => {
      const user = await authService.getCurrentUser()
      setState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      })
    })()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const user = await authService.login(email, password)
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    await authService.logout()
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
