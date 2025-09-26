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
          {!data && <div className="text-sm text-muted-foreground">No data available</div>}
          {data && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total sold</div>
                  <div className="text-xl font-semibold">{data.totalSold}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Revenue this year</div>
                  <div className="text-xl font-semibold">{formatCurrency(data.revenueThisYear, DEFAULT_CURRENCY)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Profit this year</div>
                  <div className="text-xl font-semibold">{formatCurrency(data.profitThisYear, DEFAULT_CURRENCY)}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-muted-foreground">Top buyers</h4>
                <ul className="mt-2 space-y-2">
                  {data.topClients.length === 0 && <li className="text-sm text-muted-foreground">No buyers yet</li>}
                  {data.topClients.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span>{c.name}</span>
                      <span className="text-sm text-muted-foreground">{c.quantity} — {formatCurrency(c.revenue, DEFAULT_CURRENCY)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
