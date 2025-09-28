/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from 'react'
import { productService } from '@/lib/products'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'

export function ProductStatsPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { user } = useAuth()
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

  // Only allow superadmin users to view product stats panel
  if (user?.role !== 'superadmin') return null

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Produktstatistiken</CardTitle>
        <div>
          <Button variant="ghost" onClick={onClose}>Schließen</Button>
        </div>
      </CardHeader>
      <CardContent>
        {!loading && stats?.product && (
          <div className="mb-4 text-sm text-muted-foreground">
            <div>Preis: {formatCurrency(stats.product.price, DEFAULT_CURRENCY)}</div>
            <div>Einkaufspreis: {formatCurrency(stats.product.buyingPrice, DEFAULT_CURRENCY)}</div>
          </div>
        )}
        {loading && <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
  {!loading && !stats && <div className="text-sm text-muted-foreground">Keine Daten verfügbar</div>}
        {!loading && stats && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-muted-foreground">Verkauft (gesamt)</div>
                <div className="text-xl font-semibold">{stats.totalSold}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Umsatz dieses Jahres</div>
                <div className="text-xl font-semibold">{formatCurrency(stats.revenueThisYear, DEFAULT_CURRENCY)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Gewinn dieses Jahres</div>
                <div className="text-xl font-semibold">{formatCurrency(stats.profitThisYear, DEFAULT_CURRENCY)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm text-muted-foreground">Top-Käufer</h4>
              <ul className="mt-2 space-y-2">
                {stats.topClients.length === 0 && <li className="text-sm text-muted-foreground">Noch keine Käufer</li>}
                {stats.topClients.map((c: any) => (
                  <li key={c.id} className="flex justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{c.quantity} Stück</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatCurrency(c.revenue, DEFAULT_CURRENCY)}</div>
                      <div className="text-xs text-muted-foreground">Gewinn {formatCurrency(c.profit ?? 0, DEFAULT_CURRENCY)}</div>
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
