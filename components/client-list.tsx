"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/lib/clients"
import { clientService } from "@/lib/clients"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Loader2, Building, Mail, Phone } from "lucide-react"
import { toast } from "sonner"

interface ClientListProps {
  onAddClient: () => void
  onEditClient: (client: Client) => void
}

export function ClientList({ onAddClient, onEditClient }: ClientListProps) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadClients = async () => {
    try {
  const data = await clientService.getAllClients()
      setClients(data)
    } catch (error) {
      toast.error("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [user])

  const handleDelete = async () => {
    if (!deleteClient || !user) return

    setDeleting(true)
    try {
  await clientService.deleteClient(deleteClient.id)
      setClients(clients.filter((c) => c.id !== deleteClient.id))
      toast.success("Client deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete client")
    } finally {
      setDeleting(false)
      setDeleteClient(null)
    }
  }

  const canEditClient = (client: Client) => {
    return user?.role === "superadmin" || client.createdBy === user?.id
  }

  const canDeleteClient = (client: Client) => {
    return user?.role === "superadmin" || client.createdBy === user?.id
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Client Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.role === "superadmin"
                ? "Manage all clients in the system"
                : "Manage your clients"}
            </p>
          </div>
          <Button onClick={onAddClient}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => onEditClient(client)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{client.company}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {client.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {client.address.city}, {client.address.state}
                      </div>
                      <div className="text-muted-foreground">{client.address.country}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {canEditClient(client) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditClient(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteClient(client) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteClient(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {clients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No clients found. Add your first client to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteClient?.name}&quot; from{" "}
              {deleteClient?.company}&quot;? This action cannot be undone and will affect
              any associated invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
