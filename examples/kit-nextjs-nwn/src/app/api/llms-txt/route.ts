import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serves the public llms.txt file for AI search engines and LLM consumption.
 * Follows the llms.txt specification: https://llmstxt.org/
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const baseUrl = new URL(request.url).origin;

  const content = `# NW Natural

> NW Natural provides safe, reliable and affordable natural gas service to homes and businesses in Oregon and Southwest Washington.

The site helps customers manage their accounts, start or stop service, learn about natural gas safety, find rebates and explore NW Natural's work in the community. This demonstration is built with Next.js and Sitecore XM Cloud.

## Key pages

- [Home](${baseUrl}/): Customer resources, safety information and company highlights
- [Account & Billing](${baseUrl}/account-billing): Payments, service changes and account support
- [Ways to Save](${baseUrl}/ways-to-save/rebates-offers): Rebates and efficient home upgrades
- [Services](${baseUrl}/services): Natural gas equipment inspections and tune-ups
- [Get Natural Gas](${baseUrl}/get-natural-gas): Home comfort, cooking and natural gas benefits
- [Safety](${baseUrl}/safety): Natural gas safety and emergency information
- [About Us](${baseUrl}/about-us): NW Natural's company and community story

## Optional

- [Sitemap](${baseUrl}/sitemap.xml): Full XML sitemap for search engines
- [LLM Sitemap](${baseUrl}/sitemap-llm.xml): LLM-optimized sitemap for AI crawlers
- [Robots](${baseUrl}/robots.txt): Crawler and bot access rules
- [AI metadata](${baseUrl}/.well-known/ai.txt): AI crawler and LLM metadata (ai.txt)
- [FAQ (JSON)](${baseUrl}/ai/faq.json): Frequently asked questions
- [Summary (JSON)](${baseUrl}/ai/summary.json): Site summary for AI consumption
- [Service (JSON)](${baseUrl}/ai/service.json): Service information for AI consumption
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
