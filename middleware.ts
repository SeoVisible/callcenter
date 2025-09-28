import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow dashboard and its subpaths
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return NextResponse.next()
  }

  // Allow Next.js internals, API routes, static assets and common files
  const allowPrefixes = [
    '/_next',
    '/api',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/_next/static',
    '/_next/image',
    '/assets',
    '/public',
  ]

  for (const p of allowPrefixes) {
    if (pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)) {
      return NextResponse.next()
    }
  }

  // Allow requests for files with an extension (images, css, js, etc.)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next()
  }

  // Redirect all other routes to /dashboard
  const url = req.nextUrl.clone()
  url.pathname = '/dashboard'
  return NextResponse.redirect(url)
}

export const config = {
  // run for all paths
  matcher: '/:path*',
}
