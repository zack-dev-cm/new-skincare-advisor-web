import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ 
    message: 'Headers test',
    timestamp: new Date().toISOString(),
    allowedDomains: process.env.ALLOWED_FRAME_DOMAINS || 'https://dermaself-demo.myshopify.com'
  })
  
  // Remove X-Frame-Options header if it exists
  response.headers.delete('X-Frame-Options')
  
  // Get allowed domains from environment variable
  const allowedDomains = process.env.ALLOWED_FRAME_DOMAINS || 'https://dermaself-demo.myshopify.com'
  
  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'same-origin')
  response.headers.set(
    'Content-Security-Policy',
    `frame-ancestors 'self' ${allowedDomains}`
  )
  
  return response
} 