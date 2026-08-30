import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Serves a concise public index for AI search engines and LLM clients. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const baseUrl = new URL(request.url).origin;

  const content = `# SLB

> SLB is a global technology company driving energy innovation for a balanced planet.

Explore how science, digital technology, and global energy expertise improve performance, support industrial decarbonization, and help scale new energy systems. Content is available in English and Spanish (Mexico).

## Key pages

- [Home](${baseUrl}/): Energy innovation and featured capabilities
- [Solutions](${baseUrl}/solutions): Integrated approaches to complex energy challenges
- [Products and services](${baseUrl}/products-and-services): Technology and domain expertise
- [Sustainability](${baseUrl}/sustainability): Climate, people, and nature
- [News and insights](${baseUrl}/news-and-insights): Company updates and expert perspectives
- [Who we are](${baseUrl}/about-us): Purpose, people, technology, and global presence
- [Español (México)](${baseUrl}/es-mx/): Sitio en español

## Machine-readable resources

- [Sitemap](${baseUrl}/sitemap.xml): Full XML sitemap
- [LLM Sitemap](${baseUrl}/sitemap-llm.xml): LLM-optimized sitemap
- [Robots](${baseUrl}/robots.txt): Crawler access rules
- [AI metadata](${baseUrl}/.well-known/ai.txt): AI crawler metadata
- [FAQ](${baseUrl}/ai/faq.json): Frequently asked questions
- [Summary](${baseUrl}/ai/summary.json): Site summary
- [Service](${baseUrl}/ai/service.json): Service information
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
