import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serves the public llms.txt file for AI search engines and LLM consumption.
 * Follows the llms.txt specification: https://llmstxt.org/
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const baseUrl = new URL(request.url).origin;

  const content = `# SiEnergy

> SiEnergy provides safe, reliable natural gas service to homes, businesses, and growing communities across Texas.

The site helps customers manage billing and payment needs, request service changes, learn about natural gas safety, understand usage and rates, and connect with SiEnergy's developer services. This website uses Next.js and Sitecore XM Cloud.

## Key pages

- [Home](${baseUrl}/): Customer resources, safety information and company highlights
- [What We Do](${baseUrl}/what-we-do): Natural gas distribution and community infrastructure
- [Customer Service](${baseUrl}/customer-service-portal): Billing, payment, service and account support
- [Payment Options](${baseUrl}/payment-options-locations): Ways to pay and available assistance resources
- [Service Options](${baseUrl}/service-options): Start, stop, transfer or install natural gas service
- [Safety](${baseUrl}/safety): Natural gas safety and emergency information
- [Company](${baseUrl}/company): SiEnergy's history, purpose and Texas community partnerships
- [Developers](${baseUrl}/business-development): Infrastructure collaboration for developers, builders and industrial users
- [Contact Us](${baseUrl}/contact-us): Customer, builder and emergency contact options

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
