"use client"

import type React from "react"

import { useState, useEffect } from "react"
type InvoiceStatus = "pending" | "maker" | "sent" | "paid" | "not_paid" | "completed"
const toInvoiceStatus = (s: unknown): InvoiceStatus | undefined => {
  const v = String(s)
  return ["pending","maker","sent","paid","not_paid","completed"].includes(v) ? (v as InvoiceStatus) : undefined
}
import type { Invoice } from "@/lib/invoices"
import { invoiceService, type CreateInvoiceData, type UpdateInvoiceData } from "@/lib/invoices"
import { clientService, type Client } from "@/lib/clients"
import { productService, type Product } from "@/lib/products"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface InvoiceFormProps {
  invoice?: Invoice
  clientId?: string
  onSuccess: () => void
  onCancel: () => void
}

interface LineItemForm {
  productId: string
  productName: string
  description: string
  quantity: number
  unitPrice: number
}

export function InvoiceForm({ invoice, clientId, onSuccess, onCancel }: InvoiceFormProps) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  // Shipping will be added as a product line item. If no shipping product exists
  // in the catalog we will insert a virtual 'Shipping' line item so it's always available.
  const [formData, setFormData] = useState({
    clientId: clientId || "",
    dueDate: "",
    taxRate: 8.5,
    notes: "",
    status: "pending",
  })
  const [lineItems, setLineItems] = useState<LineItemForm[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [user])

  useEffect(() => {
    if (invoice) {
      setFormData({
        clientId: invoice.clientId,
        dueDate: invoice.dueDate ? invoice.dueDate.split("T")[0] : "",
        taxRate: invoice.taxRate,
        notes: invoice.notes,
        status: invoice.status || "pending",
      })
      setLineItems(
        invoice.lineItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      )
    } else if (clientId) {
      setFormData((prev) => ({ ...prev, clientId }))
    } else {
      // Set default due date to 30 days from now
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 30)
      setFormData((prev) => ({
        ...prev,
        dueDate: defaultDueDate.toISOString().split("T")[0],
      }))
    }
  }, [invoice, clientId])

  useEffect(() => {
    if (!invoice && clients.length > 0 && !formData.clientId) {
      setFormData((prev) => ({ ...prev, clientId: clients[0].id }))
    }
  }, [clients, invoice, formData.clientId])

  const loadData = async () => {
    if (!user) return
    try {
      const [clientsData, productsData] = await Promise.all([
        clientService.getAllClients(),
        productService.getAllProducts(),
      ])
  // Debugging: log received counts
  console.debug("InvoiceForm.loadData: clients", Array.isArray(clientsData) ? clientsData.length : typeof clientsData)
  console.debug("InvoiceForm.loadData: products", Array.isArray(productsData) ? productsData.length : typeof productsData)
      setClients(clientsData)
      setProducts(productsData)
    } catch {
      toast.error("Error", {
        description: "Failed to load data",
      })
    }
  }

  // shipping products are regular products that either have category 'shipping' or include 'shipping' in the name
  const shippingProducts = products.filter((p) => (p.category || "").toLowerCase() === "shipping" || p.name.toLowerCase().includes("shipping"))

  const addShipping = () => {
    // Prefer an explicit shipping product if present
    const product = products.find((p) => (p.category || "").toLowerCase() === "shipping" || p.name.toLowerCase().includes("shipping"))
    if (product) {
      setLineItems([
        ...lineItems,
        {
          productId: product.id,
          productName: product.name,
          description: product.description || "Shipping",
          quantity: 1,
          unitPrice: product.price,
        },
      ])
      return
    }

    // No shipping product in catalog: insert a virtual shipping line item so user can always add shipping
    setLineItems([
      ...lineItems,
      {
        productId: "virtual-shipping",
        productName: "Shipping",
        description: "Shipping",
        quantity: 1,
        unitPrice: 0,
      },
    ])
  }

  const addLineItem = () => {
    // Ensure a shipping line item exists as the first row. Prefer a catalog shipping product
    const hasShipping = lineItems.some((li) => {
      if (!li) return false
      if (li.productId === "virtual-shipping") return true
      const p = products.find((p) => p.id === li.productId)
      return !!p && ((p.category || "").toLowerCase() === "shipping" || p.name.toLowerCase().includes("shipping"))
    })

    const newItems = [...lineItems]
    if (!hasShipping) {
      const product = products.find((p) => (p.category || "").toLowerCase() === "shipping" || p.name.toLowerCase().includes("shipping"))
      if (product) {
        newItems.unshift({
          productId: product.id,
          productName: product.name,
          description: product.description || "Shipping",
          quantity: 1,
          unitPrice: product.price,
        })
      } else {
        newItems.unshift({
          productId: "virtual-shipping",
          productName: "Shipping",
          description: "Shipping",
          quantity: 1,
          unitPrice: 0,
        })
      }
    }

    // Add the new blank item after shipping (or at end if shipping already exists)
    newItems.push({
      productId: "",
      productName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
    })

    setLineItems(newItems)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItemForm, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }

    // If product is selected, auto-fill name, description, and price
    if (field === "productId" && typeof value === "string") {
      const product = products.find((p) => p.id === value)
      if (product) {
        // For shipping-type products, normalize the productName to 'Shipping'
        const isShipping = ((product.category || "").toLowerCase() === "shipping") || product.name.toLowerCase().includes("shipping")
        updated[index].productName = isShipping ? "Shipping" : product.name
        updated[index].description = product.description
        updated[index].unitPrice = product.price
      }
    }

    // Enforce minimum unit price based on selected product
    if (field === "unitPrice" && typeof value === "number") {
      const productId = updated[index].productId
      const product = products.find((p) => p.id === productId)
      if (product && value < product.price) {
        // clamp to product price
        updated[index].unitPrice = product.price
      }
    }

    setLineItems(updated)
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  const calculateTax = () => {
    return (calculateSubtotal() * formData.taxRate) / 100
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!user) {
      setError("User not authenticated")
      setLoading(false)
      return
    }

    if (lineItems.length === 0) {
      setError("Please add at least one line item")
      setLoading(false)
      return
    }

    if (!formData.clientId) {
      setError("Please select a client")
      setLoading(false)
      return
    }

    try {
      const selectedClient = clients.find((c) => c.id === formData.clientId)
      if (!selectedClient) {
        setError("Selected client not found")
        return
      }

      const clientData = {
        name: selectedClient.name,
        email: selectedClient.email,
        company: selectedClient.company,
      }

      if (invoice) {
        // Validate unit prices are not below the product's listed price
        for (const item of lineItems) {
          if (item.productId) {
            const prod = products.find((p) => p.id === item.productId)
            if (prod && item.unitPrice < prod.price) {
              setError(`Unit price for "${item.productName}" cannot be lower than product price (${prod.price.toFixed(2)})`)
              setLoading(false)
              return
            }
          }
        }
        // Update existing invoice
        const updateData: UpdateInvoiceData = {
          clientId: formData.clientId,
          dueDate: formData.dueDate,
            status: toInvoiceStatus((formData as unknown as Record<string, unknown>).status),
          lineItems: lineItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          taxRate: formData.taxRate,
          notes: formData.notes,
        }
        await invoiceService.updateInvoice(invoice.id, updateData)
        toast.success("Success", {
          description: "Invoice updated successfully",
        })
      } else {
        // Validate unit prices for new invoice as well
        for (const item of lineItems) {
          if (item.productId) {
            const prod = products.find((p) => p.id === item.productId)
            if (prod && item.unitPrice < prod.price) {
              setError(`Unit price for "${item.productName}" cannot be lower than product price (${prod.price.toFixed(2)})`)
              setLoading(false)
              return
            }
          }
        }
        // Create new invoice
        const createData: CreateInvoiceData = {
          clientId: formData.clientId,
          dueDate: formData.dueDate,
          lineItems: lineItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          taxRate: formData.taxRate,
          notes: formData.notes,
          createdBy: user.id,
        }
        await invoiceService.createInvoice(createData)
        toast.success("Success", {
          description: "Invoice created successfully",
        })
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <CardTitle>{invoice ? "Edit Invoice" : "Create New Invoice"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientId ? (
              <div className="space-y-2">
                <Label>Client</Label>
                <div className="bg-[#f5f7fc] border border-[#e5e8f0] rounded-lg px-4 py-2 text-[#37445c]">
                  {(() => {
                    const c = clients.find(c => c.id === formData.clientId);
                    return c ? `${c.name}${c.company ? ' - ' + c.company : ''}` : 'Current Client';
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
            {invoice && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                      value={toInvoiceStatus((formData as unknown as Record<string, unknown>).status) ?? "pending"}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="maker">Maker</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="not_paid">Not Paid</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Line Items</h3>
              <Button type="button" variant="outline" onClick={addLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {/* Shipping is automatically inserted as the first line item when adding items */}

            {lineItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {(() => {
                          const p = products.find((p) => p.id === item.productId)
                          const isShipping = item.productId === "virtual-shipping" || (!!p && (((p.category || "").toLowerCase() === "shipping") || p.name.toLowerCase().includes("shipping")))
                          if (isShipping) {
                            return (
                              <div className="font-medium">Shipping</div>
                            )
                          }

                          return (
                            <Select
                              value={item.productId}
                              onValueChange={(value) => updateLineItem(index, "productId", value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Shipping options first (normalize label to 'Shipping') */}
                                {products.filter(p => ((p.category||"").toLowerCase() === "shipping") || p.name.toLowerCase().includes("shipping")).map((product) => (
                                  <SelectItem key={`ship-${product.id}`} value={product.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>Shipping</span>
                                      <span className="text-sm text-muted-foreground">${product.price.toFixed(2)}</span>
                                    </div>
                                  </SelectItem>
                                ))}

                                {/* If no shipping product exists, allow a virtual shipping option */}
                                {products.every(p => !(((p.category||"").toLowerCase() === "shipping") || p.name.toLowerCase().includes("shipping"))) && (
                                  <SelectItem key="virtual-shipping" value="virtual-shipping">Shipping</SelectItem>
                                )}

                                {/* Then list remaining non-shipping products */}
                                {products.filter(p => !(((p.category||"").toLowerCase() === "shipping") || p.name.toLowerCase().includes("shipping"))).map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={(() => {
                            const p = products.find((p) => p.id === item.productId)
                            return p ? p.price : 0
                          })()}
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeLineItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="taxRate">Tax Rate (%):</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number.parseFloat(e.target.value) || 0 })}
                    className="w-20"
                  />
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter any additional notes for this invoice"
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
