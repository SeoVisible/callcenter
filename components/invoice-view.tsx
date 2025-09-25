"use client"

import type { Invoice } from "@/lib/invoices"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Send } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { invoiceService } from "@/lib/invoices"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

const toInvoiceStatus = (s: unknown) => {
  const v = String(s)
  return ["pending","maker","sent","paid","not_paid","completed"].includes(v) ? (v as Invoice["status"]) : undefined
}

interface InvoiceViewProps {
  invoice: Invoice
  onBack: () => void
  onEdit: () => void
  onSend?: () => void
}

export function InvoiceView({ invoice, onBack, onEdit, onSend }: InvoiceViewProps) {
  const [statusSelectOpen, setStatusSelectOpen] = useState(false)
  const getStatusBadge = (status: Invoice["status"]) => {
    const colors: Record<string,string> = {
      pending: "bg-gray-100 text-gray-800",
      maker: "bg-amber-100 text-amber-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      not_paid: "bg-red-100 text-red-800",
      completed: "bg-teal-100 text-teal-800",
    }

    const label = typeof status === 'string' ? status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown'
    return <Badge className={colors[status] ?? 'bg-gray-100 text-gray-800'}>{label}</Badge>
  }

  const generatePdf = (opts: { showPrices: boolean }) => {
    const { showPrices } = opts;
    const doc = new jsPDF();
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 80);
    doc.text(`INVOICE`, 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`invoice-${invoice.id}`, 14, 26);
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(`Status: ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`, 150, 18, { align: "right" });
    doc.text(`Created: ${new Date(invoice.createdAt).toLocaleDateString()}`, 150, 26, { align: "right" });
    doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 150, 34, { align: "right" });

    // Bill To
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 80);
    doc.text("Bill To:", 14, 42);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(invoice.clientName, 14, 48);
    if (invoice.clientCompany) doc.text(invoice.clientCompany, 14, 54);
    if (invoice.clientEmail) doc.text(invoice.clientEmail, 14, 60);

    // Table columns differ depending on whether prices are shown
    const head = showPrices ? ["Description", "Qty", "Unit Price", "Total"] : ["Description", "Qty"];
    const body = invoice.lineItems.map(item => {
      if (showPrices) {
        return [
          item.productName + (item.description ? `\n${item.description}` : ""),
          item.quantity,
          `$${item.unitPrice.toFixed(2)}`,
          `$${item.total.toFixed(2)}`
        ]
      }
      return [
        item.productName + (item.description ? `\n${item.description}` : ""),
        item.quantity
      ]
    })

    autoTable(doc, {
      startY: 70,
      head: [head],
      body,
      headStyles: { fillColor: [40, 40, 80], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      styles: { cellPadding: 2 },
    });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100;
    // Totals (only show when prices are included)
    if (showPrices) {
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 80);
      doc.text(`Subtotal:`, 130, finalY + 10);
      doc.text(`$${invoice.subtotal.toFixed(2)}`, 180, finalY + 10, { align: "right" });
      doc.text(`Tax (${invoice.taxRate}%):`, 130, finalY + 18);
      doc.text(`$${invoice.taxAmount.toFixed(2)}`, 180, finalY + 18, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`Total:`, 130, finalY + 28);
      doc.text(`$${invoice.total.toFixed(2)}`, 180, finalY + 28, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0);
    }

    // Notes
    if (invoice.notes) {
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 80);
      doc.text("Notes:", 14, finalY + 40);
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(invoice.notes, 14, finalY + 48, { maxWidth: 180 });
      doc.setTextColor(0);
    }

    const filename = showPrices ? `invoice-${invoice.id}.pdf` : `invoice-${invoice.id}-no-prices.pdf`;
    doc.save(filename);
  }

  const handleDownloadWithPrices = () => generatePdf({ showPrices: true })
  const handleDownloadWithoutPrices = () => generatePdf({ showPrices: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-3">
                Invoice {invoice.invoiceNumber}
                {/* compact inline badge + select positioned under the badge */}
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex items-center">
                    <button
                      type="button"
                      aria-label="Change status"
                      onClick={() => setStatusSelectOpen(true)}
                      className="-ml-1 rounded-md focus:outline-none"
                    >
                      {getStatusBadge(invoice.status)}
                    </button>

                    <Select
                      value={invoice.status}
                      open={statusSelectOpen}
                      onOpenChange={setStatusSelectOpen}
          onValueChange={async (value: string) => {
                        try {
            // convert to known invoice status if possible
            const statusValue = toInvoiceStatus(value) || (value as Invoice["status"])
            await invoiceService.updateInvoice(invoice.id, { status: statusValue })
                          toast.success(`Status updated to ${value}`)
                          setStatusSelectOpen(false)
                          setTimeout(() => window.location.reload(), 250)
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to update status")
                        }
                      }}
                    >
                      <SelectTrigger className="ml-2 h-9 w-36 rounded-md text-sm px-3 py-1 bg-white border border-[#e5e8f0] shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6} className="!w-36 mt-1 shadow-lg rounded-md">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="maker">Maker</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="not_paid">Not Paid</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created on {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            { (invoice.status === "pending" || invoice.status === "maker") && onSend && (
              <Button onClick={onSend}>
                <Send className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
            )}
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>

            {/* Single Download dropdown: Client PDF (with prices) / Maker PDF (no prices) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label="Download PDF">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadWithPrices}>
                  Client PDF (with prices)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadWithoutPrices}>
                  Maker PDF (no prices)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{invoice.clientName}</div>
              <div className="text-sm text-muted-foreground">{invoice.clientCompany}</div>
              <div className="text-sm text-muted-foreground">{invoice.clientEmail}</div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Issue Date:</span>
                <span className="text-sm">{new Date(invoice.issueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              {invoice.sentAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sent Date:</span>
                  <span className="text-sm">{new Date(invoice.sentAt).toLocaleDateString()}</span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Paid Date:</span>
                  <span className="text-sm">{new Date(invoice.paidAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({invoice.taxRate}%):</span>
                <span>${invoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
