import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serves the public llms.txt file for AI search engines and LLM consumption.
 * Follows the llms.txt specification: https://llmstxt.org/
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const baseUrl = new URL(request.url).origin;

  const content = `# Kirkland & Ellis

> Kirkland & Ellis is a global law firm advising clients on transformative transactions, high-stakes disputes, restructurings, and intellectual property matters.

Kirkland lawyers work across practices and offices as one team, combining deep legal experience with commercial judgment on matters that shape businesses and industries.

## Key pages

- [Home](${baseUrl}/): Firm overview, featured matters, and recent insights
- [Lawyers](${baseUrl}/Lawyers): Lawyers and professional profiles
- [Services](${baseUrl}/Services): Practices and legal services
- [News & Insights](${baseUrl}/News-and-Insights): News, publications, and events
- [Careers](${baseUrl}/Careers): Opportunities and life at the firm
- [Locations](${baseUrl}/Locations): Global office information
- [About](${baseUrl}/About): Firm overview and commitments

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
