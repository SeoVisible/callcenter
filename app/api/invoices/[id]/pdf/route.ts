import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	const { id } = await context.params

	// Placeholder implementation: return 501 Not Implemented.
	// Replace with actual PDF generation (dynamic import of pdfkit) when ready.
	return NextResponse.json({ error: `PDF generation not implemented for invoice ${id}` }, { status: 501 })
}

