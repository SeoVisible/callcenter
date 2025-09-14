import { NextResponse } from "next/server"

export async function POST() {
  // Clear the JWT cookie
  const response = NextResponse.json({ success: true })
  response.headers.set(
    "Set-Cookie",
    "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  )
  return response
}
