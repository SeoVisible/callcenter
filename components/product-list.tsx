"use client"

import { useState, useEffect } from "react"
import type { Product } from "@/lib/products"
import { productService } from "@/lib/products"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Edit, Trash2, Loader2, Globe, User } from "lucide-react"
import { toast } from "sonner"

interface ProductListProps {
  onAddProduct: () => void
  onEditProduct: (product: Product) => void
}

export function ProductList({ onAddProduct, onEditProduct }: ProductListProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  // const { toast } = useToast()

  useEffect(() => {
    const loadProducts = async () => {
      try {
  const data = await productService.getAllProducts()
        setProducts(data)
      } catch {
        toast.error("Error", {
          description: "Failed to load products",
        })
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [user])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250)
    return () => clearTimeout(t)
  }, [query])

  const filteredProducts = products.filter((p) => {
    if (!debouncedQuery) return true
    const q = debouncedQuery
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      String((p as unknown as Record<string, unknown>).stock ?? "").toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q)
    )
  })

  const handleDelete = async () => {
    if (!deleteProduct || !user) return

    setDeleting(true)
    try {
  await productService.deleteProduct(deleteProduct.id)
      setProducts(products.filter((p) => p.id !== deleteProduct.id))
      toast.success("Success", {
        description: "Product deleted successfully",
      })
    } catch (error: unknown) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to delete product",
      })
    } finally {
      setDeleting(false)
      setDeleteProduct(null)
    }
  }

  const canEditProduct = (product: Product) => {
    return user?.role === "superadmin" || product.createdBy === user?.id
  }

  const canDeleteProduct = (product: Product) => {
    return user?.role === "superadmin" || product.createdBy === user?.id
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
            <CardTitle>Product Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.role === "superadmin" ? "Manage all products globally" : "Manage products for your clients"}
            </p>
          </div>
          {user?.role === "superadmin" && (
            <Button onClick={onAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input placeholder="Search products by name, sku, stock, category or id..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">{product.description}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-mono text-sm">{String((product as unknown as Record<string, unknown>).stock ?? 0)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">${product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {product.isGlobal ? (
                        <>
                          <Globe className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-blue-600">Global</span>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-orange-600">Personal</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEditProduct(product) && (
                        <Button variant="outline" size="sm" onClick={() => onEditProduct(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeleteProduct(product) && (
                        <Button variant="outline" size="sm" onClick={() => setDeleteProduct(product)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No products found. Create your first product to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteProduct?.name}&quot;? This action cannot be undone.
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
