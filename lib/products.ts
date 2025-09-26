export interface Product {
  id: string
  name: string
  description: string
  price: number
  buyingPrice?: number
  stock: number
  category: string
  sku: string
  createdBy: string // User ID who created the product
  isGlobal: boolean // true for superadmin products, false for user-specific
  createdAt: string
  updatedAt: string
}

export interface CreateProductData {
  name: string
  description: string
  price: number
  buyingPrice?: number
  stock?: number
  category: string
  sku: string
  createdBy: string
  isGlobal: boolean
}

export interface UpdateProductData {
  name?: string
  description?: string
  price?: number
  buyingPrice?: number
  stock?: number
  category?: string
  sku?: string
}

export interface ProductStats {
  totalSold: number
  revenueThisYear: number
  profitThisYear: number
  topClients: Array<{ id: string; name: string; quantity: number; revenue: number; profit: number }>
  product: { price: number; buyingPrice: number }
}

class ProductService {
  async getAllProducts(): Promise<Product[]> {
    const res = await fetch("/api/products")
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to fetch products")
    }
    return res.json()
  }

  async getProductById(id: string): Promise<Product | null> {
    const res = await fetch(`/api/products/${id}`)
    if (!res.ok) return null
    return res.json()
  }

  async createProduct(productData: CreateProductData): Promise<Product> {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to create product")
    }
    return res.json()
  }

  async updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...productData }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to update product")
    }
    return res.json()
  }

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE"
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to delete product")
    }
  }

  async fetchProductStats(id: string): Promise<ProductStats> {
    const res = await fetch(`/api/products/${id}/stats`)
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to fetch product stats')
    }
    return res.json()
  }

  getCategories(): string[] {
    return ["Services", "Products", "Software", "Hardware", "Consulting", "Other"]
  }
}

export const productService = new ProductService()
