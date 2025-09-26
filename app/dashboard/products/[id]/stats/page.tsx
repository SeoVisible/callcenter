import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency'

type ProductStats = {
  totalSold: number
  revenueThisYear: number
  profitThisYear: number
  topClients: { id: string; name: string; quantity: number; revenue: number }[]
  product?: { price?: number; buyingPrice?: number }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/products/${id}/stats`, { cache: 'no-store' })
  const data: ProductStats | null = res.ok ? await res.json() : null

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <CardTitle>Produktstatistiken</CardTitle>
          {!data && <div className="text-sm text-muted-foreground">Keine Daten verfügbar</div>}

          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Insgesamt verkauft</div>
                  <div className="text-xl font-semibold">{data.totalSold}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Umsatz dieses Jahres</div>
                  <div className="text-xl font-semibold">{formatCurrency(data.revenueThisYear, DEFAULT_CURRENCY)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Gewinn dieses Jahres</div>
                  <div className="text-xl font-semibold">{formatCurrency(data.profitThisYear, DEFAULT_CURRENCY)}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-muted-foreground">Top-Käufer</h4>
                <ul className="mt-2 space-y-2">
                  {data.topClients.length === 0 ? (
                    <li className="text-sm text-muted-foreground">Noch keine Käufer</li>
                  ) : (
                    data.topClients.map((c) => (
                      <li key={c.id} className="flex justify-between items-center">
                        <span>{c.name}</span>
                        <span className="text-sm text-muted-foreground">{c.quantity} — {formatCurrency(c.revenue, DEFAULT_CURRENCY)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
