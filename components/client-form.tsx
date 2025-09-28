"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { Client } from "@/lib/clients"
import {
  clientService,
  type CreateClientData,
  type UpdateClientData,
} from "@/lib/clients"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { InvoiceForm } from "@/components/invoice-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'
import { invoiceService, type Invoice } from "@/lib/invoices"
import { formatStatusLabel } from '@/lib/status'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ClientFormProps {
  client?: Client
  onSuccess: () => void
  onCancel: () => void
}

export function ClientForm({ client, onSuccess, onCancel, onViewInvoice }: ClientFormProps & { onViewInvoice?: (invoice: Invoice) => void }) {
  const [createdClient, setCreatedClient] = useState<Client | null>(null)
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Germany",
    },
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        address: {
          street: client.address?.street ?? "",
          city: client.address?.city ?? "",
          state: client.address?.state ?? "",
          zipCode: client.address?.zipCode ?? "",
          country: client.address?.country ?? "Germany",
        },
        notes: client.notes,
      })
    }
  }, [client])

  useEffect(() => {
    async function fetchInvoices() {
      if (client && client.id) {
        const allInvoices = await invoiceService.getAllInvoices()
        setClientInvoices(allInvoices.filter(inv => inv.clientId === client.id))
      }
    }
    fetchInvoices()
  }, [client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!user) {
      setError("User not authenticated")
      setLoading(false)
      return
    }

    try {
      if (client) {
  // Update existing client
        const updateData: UpdateClientData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          address: formData.address,
          notes: formData.notes,
        }
        await clientService.updateClient(client.id, updateData)
        toast.success("Kunde erfolgreich aktualisiert")
      } else {
        // Create new client
        const createData: CreateClientData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          address: formData.address,
          notes: formData.notes,
          createdBy: user.id,
        }
        const newClient = await clientService.createClient(createData)
        console.log('Created client:', newClient)
        if (newClient && newClient.id) {
          setCreatedClient(newClient)
          toast.success("Kunde erfolgreich erstellt")
          // Do not call onSuccess yet; show invoice form
        } else {
          setError("Kunde konnte nicht erstellt werden. Bitte versuchen Sie es erneut.")
        }
      }
      onSuccess()
    } catch (err) {
  setError(err instanceof Error ? err.message : "Vorgang fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  const handleAddressChange = (
    field: keyof typeof formData.address,
    value: string
  ) => {
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        [field]: value,
      },
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
  <CardTitle>{client ? 'Kunde bearbeiten' : 'Neuen Kunden hinzufügen'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
                <h3 className="text-lg font-medium">Allgemeine Informationen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                    <Label htmlFor="name">Vollständiger Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                      placeholder="Vollständigen Namen des Kunden eingeben"
                  required
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="company">Unternehmen</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                      placeholder="Firmennamen eingeben"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                    <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                      placeholder="E-Mail-Adresse eingeben"
                  required
                />
              </div>

              <div className="space-y-2">
                    <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                      placeholder="Telefonnummer eingeben"
                  required
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
                <h3 className="text-lg font-medium">Adressinformationen</h3>
            <div className="space-y-2">
                  <Label htmlFor="street">Straße</Label>
              <Input
                id="street"
                value={formData.address.street}
                onChange={(e) => handleAddressChange("street", e.target.value)}
                    placeholder="Straße eingeben"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  placeholder="Stadt eingeben"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">Postleitzahl</Label>
                <Input
                  id="zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => handleAddressChange("zipCode", e.target.value)}
                  placeholder="Postleitzahl eingeben"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Land</Label>
              <Input
                id="country"
                value={formData.address.country}
                onChange={(e) => handleAddressChange("country", e.target.value)}
                placeholder="Land eingeben"
                required
              />
            </div>
          </div>


          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Weitere Informationen</h3>
            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Geben Sie zusätzliche Notizen zu diesem Kunden ein"
                rows={4}
              />
            </div>
          </div>


          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!createdClient ? (
              <>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {client ? "Kunde aktualisieren" : "Kunde erstellen"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Abbrechen
                </Button>
              </>
            ) : null}
          </div>

          {/* Show InvoiceForm after client is created */}
          {createdClient && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Erste Rechnung für diesen Kunden erstellen</h3>
              <InvoiceForm
                clientId={createdClient.id}
                onSuccess={onSuccess}
                onCancel={onSuccess}
              />
            </div>
          )}
        </form>
        {/* Show related invoices if editing/viewing a client */}
        {client && clientInvoices.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Rechnungen für diesen Kunden</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rechnung #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fälligkeitsdatum</TableHead>
                  <TableHead>Gesamt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientInvoices.map(inv => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--sidebar-item-hover)]"
                    onClick={() => onViewInvoice && onViewInvoice(inv)}
                  >
                    <TableCell>{inv.invoiceNumber || inv.id.slice(0, 8)}</TableCell>
                    <TableCell>{formatStatusLabel(inv.status)}</TableCell>
                    <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(inv.total ?? 0, DEFAULT_CURRENCY)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
