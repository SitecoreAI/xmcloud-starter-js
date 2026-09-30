import { NextResponse } from 'next/server';
/** The demonstration is excluded from every crawler, connected or disconnected. */
export async function GET() {
  return new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } });
}
