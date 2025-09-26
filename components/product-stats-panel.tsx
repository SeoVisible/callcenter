/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from 'react'
import { productService } from '@/lib/products'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'

export function ProductStatsPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    productService.fetchProductStats(id).then((s) => {
      if (mounted) setStats(s)
    }).catch(() => {
      if (mounted) setStats(null)
    }).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [id])

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Product Statistics</CardTitle>
        <div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent>
        {!loading && stats?.product && (
          <div className="mb-4 text-sm text-muted-foreground">
            <div>Price: {formatCurrency(stats.product.price, DEFAULT_CURRENCY)}</div>
            <div>Buying price: {formatCurrency(stats.product.buyingPrice, DEFAULT_CURRENCY)}</div>
          </div>
        )}
        {loading && <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
        {!loading && !stats && <div className="text-sm text-muted-foreground">No data available</div>}
        {!loading && stats && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-muted-foreground">Total sold</div>
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

            <div>
              <h4 className="text-sm text-muted-foreground">Top buyers</h4>
              <ul className="mt-2 space-y-2">
                {stats.topClients.length === 0 && <li className="text-sm text-muted-foreground">No buyers yet</li>}
                {stats.topClients.map((c: any) => (
                  <li key={c.id} className="flex justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{c.quantity} items</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatCurrency(c.revenue, DEFAULT_CURRENCY)}</div>
                      <div className="text-xs text-muted-foreground">Profit {formatCurrency(c.profit ?? 0, DEFAULT_CURRENCY)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
