"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Product } from "@/lib/products"
import { productService, type CreateProductData, type UpdateProductData } from "@/lib/products"
import type { ProductStats } from '@/lib/products'
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ArrowLeft, Info } from "lucide-react"
import { toast } from "sonner"

interface ProductFormProps {
  product?: Product
  onSuccess: () => void
  onCancel: () => void
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    buyingPrice: "",
    stock: "",
    category: "",
    sku: "",
    isGlobal: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [stats, setStats] = useState<ProductStats | null>(null)
  // const { toast } = useToast()
  const rawCategories = productService.getCategories()
  // Normalize/trim category strings so Select values match exactly
  const normalized = rawCategories.map((c) => (c ?? "").toString().trim()).filter(Boolean)
  const currentCat = (product?.category ?? "").toString().trim()
  const categoryOptions = currentCat ? Array.from(new Set([currentCat, ...normalized])) : normalized

  // If product exists and formData.category is not matching the normalized current category,
  // set it so the Select shows the desired option.
  useEffect(() => {
    if (!product) return
    const cur = (product.category ?? "").toString().trim()
    if (cur && formData.category !== cur) {
      setFormData((prev) => ({ ...prev, category: cur }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.category, categoryOptions.join('|')])

  useEffect(() => {
    if (product) {
        setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        buyingPrice: (product as unknown as { buyingPrice?: number }).buyingPrice?.toString() ?? "",
        stock: (product as unknown as { stock?: number }).stock?.toString() ?? "",
        category: (product.category ?? "").toString().trim(),
        sku: product.sku,
        isGlobal: product.isGlobal,
      })
    } else {
      // Set default isGlobal based on user role
      setFormData((prev) => ({
        ...prev,
        isGlobal: user?.role === "superadmin",
      }))
    }
    // When editing an existing product, fetch stats
    if (product?.id) {
      ;(async () => {
        try {
          const s = await productService.fetchProductStats(product.id)
          setStats(s)
        } catch (err) {
          // silently ignore stats fetch errors
          // console.debug('Failed to fetch product stats', err)
        }
      })()
    }
  }, [product, user])

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
      const price = Number.parseFloat(formData.price)
      const buying = formData.buyingPrice === "" ? undefined : Number.parseFloat(formData.buyingPrice)
      if (isNaN(price) || price < 0) {
        setError("Please enter a valid price")
        return
      }
      if (buying !== undefined && (isNaN(buying) || buying < 0)) {
        setError("Please enter a valid non-negative buying price")
        return
      }
      // Validate stock if provided
      const stockValue = formData.stock === "" ? undefined : Number.parseInt(formData.stock, 10)
      if (stockValue !== undefined && (isNaN(stockValue) || stockValue < 0)) {
        setError("Please enter a valid non-negative stock value")
        return
      }

      if (product) {
        // Update existing product
        const updateData: UpdateProductData = {
          name: formData.name,
          description: formData.description,
          price,
          ...(buying !== undefined ? { buyingPrice: buying } : {}),
          ...(stockValue !== undefined ? { stock: stockValue } : {}),
          ...(formData.category !== "" ? { category: formData.category } : {}),
          ...(formData.sku !== "" ? { sku: formData.sku } : {}),
        }
        // Safety: if category wasn't included in the update payload (for example
        // the Select produced an empty value), preserve the existing category
        // from the product prop so we don't accidentally clear it in the DB.
        if (!Object.prototype.hasOwnProperty.call(updateData, 'category') && product?.category) {
          // Keep category when not provided in the update payload
          ;(updateData as unknown as Record<string, unknown>).category = product.category
        }

        await productService.updateProduct(product.id, updateData)
        toast.success("Erfolg", {
          description: "Produkt erfolgreich aktualisiert",
        })
      } else {
        // Create new product
        const createData: CreateProductData = {
          name: formData.name,
          description: formData.description,
          price,
          buyingPrice: buying,
          stock: stockValue ?? 0,
          category: formData.category,
          sku: formData.sku,
          createdBy: user.id,
          isGlobal: formData.isGlobal,
        }
        await productService.createProduct(createData)
        toast.success("Erfolg", {
          description: "Produkt erfolgreich erstellt",
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
      <CardTitle>{product ? 'Produkt bearbeiten' : 'Neues Produkt hinzufügen'}</CardTitle>
          </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Produktname</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Produktname eingeben"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="SKU eingeben (z.B. PROD-001)"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Produktbeschreibung eingeben"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select
                value={formData.category || (product?.category ?? "").toString().trim()}
                onValueChange={(value) => setFormData({ ...formData, category: (value ?? "").toString().trim() })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* fallback to product category when editing so Select shows it by default */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preis ({DEFAULT_CURRENCY})</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder={formatCurrency(0, DEFAULT_CURRENCY)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyingPrice">Einkaufspreis ({DEFAULT_CURRENCY})</Label>
              <Input
                id="buyingPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.buyingPrice}
                onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                placeholder={formatCurrency(0, DEFAULT_CURRENCY)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Lagerbestand</Label>
              <Input
                id="stock"
                type="number"
                step="1"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {!product && user?.role === "superadmin" && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isGlobal"
                  checked={formData.isGlobal}
                  onCheckedChange={(checked) => setFormData({ ...formData, isGlobal: !!checked })}
                />
                <Label htmlFor="isGlobal" className="text-sm font-medium">
                  Produkt global verfügbar machen
                </Label>
              </div>
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Produktumfang:</p>
                  <p>
                    <strong>Globale Produkte</strong> sind für alle Benutzer verfügbar und können in jeder Rechnung verwendet werden.
                  </p>
                  <p>
                    <strong>Persönliche Produkte</strong> sind nur für Sie sichtbar und mit Ihren Kunden verknüpft.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!product && user?.role === "user" && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p>Als normaler Benutzer sind Ihre Produkte persönlich und nur für Ihre Kunden verfügbar.</p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? 'Produkt aktualisieren' : 'Produkt erstellen'}
            </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Abbrechen
            </Button>
          </div>
        </form>
        {product && stats && user?.role === 'superadmin' && (
          <div className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle>Produktstatistiken</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total sold (lifetime)</div>
                    <div className="text-xl font-semibold">{stats.totalSold}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Revenue this year</div>
                    <div className="text-xl font-semibold">{formatCurrency(stats.revenueThisYear, DEFAULT_CURRENCY)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Profit this year</div>
                    <div className="text-xl font-semibold">{formatCurrency(stats.profitThisYear, DEFAULT_CURRENCY)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-muted-foreground">Top buyers</div>
                  <ul className="mt-2 space-y-2">
                    {stats.topClients.length === 0 && (
                      <li className="text-sm text-muted-foreground">No buyers yet</li>
                    )}
                    {stats.topClients.map((c) => (
                      <li key={c.id} className="flex justify-between">
                        <span>{c.name}</span>
                        <span className="text-sm text-muted-foreground">{c.quantity} — {formatCurrency(c.revenue, DEFAULT_CURRENCY)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
