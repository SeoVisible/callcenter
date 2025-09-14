export interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  notes: string
  createdBy: string // User ID who created the client
  createdAt: string
  updatedAt: string
}

export interface CreateClientData {
  name: string
  email: string
  phone: string
  company: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  notes: string
  createdBy: string
}

export interface UpdateClientData {
  name?: string
  email?: string
  phone?: string
  company?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  notes?: string
}


class ClientService {
  async getAllClients(): Promise<Client[]> {
    const res = await fetch("/api/clients")
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to fetch clients")
    }
    return res.json()
  }

  async getClientById(id: string): Promise<Client | null> {
    const res = await fetch(`/api/clients/${id}`)
    if (!res.ok) return null
    return res.json()
  }

  async createClient(clientData: CreateClientData): Promise<Client> {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to create client")
    }
    return res.json()
  }

  async updateClient(id: string, clientData: UpdateClientData): Promise<Client> {
    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to update client")
    }
    return res.json()
  }

  async deleteClient(id: string): Promise<void> {
    const res = await fetch(`/api/clients/${id}`, {
      method: "DELETE"
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to delete client")
    }
  }
}

export const clientService = new ClientService()
