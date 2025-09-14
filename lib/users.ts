import type { User, UserRole } from "./auth"

export interface CreateUserData {
  email: string
  name: string
  role: UserRole
  password: string
}

export interface UpdateUserData {
  email?: string
  name?: string
  role?: UserRole
}

class UserService {
  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE"
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to delete user")
    }
  }
  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to update user")
    }
    return res.json()
  }
  async createUser(userData: CreateUserData): Promise<User> {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to create user")
    }
    return res.json()
  }
  async getAllUsers(): Promise<User[]> {
    const res = await fetch("/api/users")
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to fetch users")
    }
    return res.json()
  }
  async loginUser(email: string, password: string): Promise<User> {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Login failed")
    }
    return res.json()
  }
  // All localStorage and getUsers logic removed. Only API/database logic should be used now.
}

export const userService = new UserService()
