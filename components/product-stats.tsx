"use client"

import { useEffect, useState } from 'react'
// using a lightweight custom modal UI instead of Dialog component
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'
import { productService, type ProductStats } from '@/lib/products'
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'

interface Props { id: string }

export function ProductStatsDialog({ id }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<ProductStats | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    productService.fetchProductStats(id).then((s) => setStats(s)).catch(() => setStats(null)).finally(() => setLoading(false))
  }, [open, id])

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Statistics</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Product Statistics</h3>
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            </div>
            {loading && (
              <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>
            )}
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
                  <div className="text-sm text-muted-foreground">Top buyers</div>
                  <ul className="mt-2 space-y-2">
                    {stats.topClients.length === 0 && <li className="text-sm text-muted-foreground">No buyers yet</li>}
                    {stats.topClients.map((c) => (
                      <li key={c.id} className="flex justify-between">
                        <span>{c.name}</span>
                        <span className="text-sm text-muted-foreground">{c.quantity} — {formatCurrency(c.revenue, DEFAULT_CURRENCY)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {!loading && !stats && (
              <div className="text-sm text-muted-foreground">Failed to load stats.</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
