"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Product } from "@/lib/products"
import { productService, type CreateProductData, type UpdateProductData } from "@/lib/products"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
    category: "",
    sku: "",
    isGlobal: false,
    stock: "0",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // const { toast } = useToast()
  const categories = productService.getCategories()

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        sku: product.sku,
        isGlobal: product.isGlobal,
  stock: (product as unknown as Record<string, unknown>).stock ? String((product as unknown as Record<string, unknown>).stock) : "0",
      })
    } else {
      // Set default isGlobal based on user role
      setFormData((prev) => ({
        ...prev,
        isGlobal: user?.role === "superadmin",
      }))
    }
  }, [product, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

      if (!user) {
      setError("Benutzer nicht authentifiziert")
      setLoading(false)
      return
    }

    // Only superadmin may create global products; normal users are not allowed to create products in production
    if (!product && user.role !== "superadmin") {
      setError("Sie haben keine Berechtigung, Produkte zu erstellen")
      setLoading(false)
      return
    }

    try {
      const price = Number.parseFloat(formData.price)
      if (isNaN(price) || price < 0) {
        setError("Bitte geben Sie einen gültigen Preis ein")
        return
      }

      if (product) {
        // Update existing product
        const updateData: UpdateProductData = {
          name: formData.name,
          description: formData.description,
          price,
          stock: Number.parseInt(formData.stock || "0"),
          category: formData.category,
          sku: formData.sku,
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
          stock: Number.parseInt(formData.stock || "0"),
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
        <CardTitle>{product ? "Produkt bearbeiten" : "Neues Produkt hinzufügen"}</CardTitle>
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
              <Label htmlFor="sku">Artikelnummer</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="SKU eingeben (z.B., PROD-001)"
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
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preis (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
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
                required
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
                  Als globales Produkt markieren
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
                    <p>Als regulärer Benutzer sind Ihre Produkte persönlich und nur für Ihre Kunden sichtbar.</p>
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
              {product ? "Produkt aktualisieren" : "Produkt erstellen"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
