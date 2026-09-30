#!/usr/bin/env python3
"""Audit rendered routes and nonproduction response guards without submitting forms.

This complements browser and screenshot review; a passing response audit is not
visual acceptance. Targets must be local or an explicitly supplied Vercel host.
"""
import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser


class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.images = []
        self.forms = []
        self.headings = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])
        if tag == 'img' and attrs.get('src'):
            self.images.append(attrs['src'])
        if tag == 'form':
            self.forms.append(attrs.get('action', ''))
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            self.headings += 1


class SameOriginRedirects(urllib.request.HTTPRedirectHandler):
    def __init__(self, origin):
        self.origin = origin

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlparse(newurl)
        if (parsed.scheme, parsed.netloc) != self.origin:
            raise urllib.error.URLError('Refused redirect outside the QA origin')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def audit(base, path):
    started = time.monotonic()
    result = {'path': path, 'status': None, 'errors': []}
    url = base + urllib.parse.quote(path, safe='/')
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'AllianzLife-LocalQA/1.0'})
        origin = urllib.parse.urlparse(base)
        opener = urllib.request.build_opener(SameOriginRedirects((origin.scheme, origin.netloc)))
        with opener.open(request, timeout=60) as response:
            body = response.read()
            result['status'] = response.status
            result['finalUrl'] = response.url
            result['bytes'] = len(body)
            result['sha256'] = hashlib.sha256(body).hexdigest()
            robots = response.headers.get('X-Robots-Tag', '').lower()
            csp = response.headers.get('Content-Security-Policy', '')
            result['noindex'] = 'noindex' in robots
            result['blocksFormSubmission'] = "form-action 'none'" in csp
            if not result['noindex']:
                result['errors'].append('missing noindex response header')
            if not result['blocksFormSubmission']:
                result['errors'].append('missing form submission response guard')
            markup = Markup()
            markup.feed(body.decode('utf-8', errors='replace'))
            result['headingCount'] = markup.headings
            result['imageCount'] = len(markup.images)
            result['formCount'] = len(markup.forms)
            external_scripts = [src for src in markup.scripts if urllib.parse.urljoin(base, src).split('/')[2] != urllib.parse.urlparse(base).netloc]
            if external_scripts:
                result['errors'].append('external script resources: ' + ', '.join(external_scripts))
            for action in markup.forms:
                if urllib.parse.urlparse(action).hostname == 'www.allianzlife.com':
                    result['errors'].append('production Allianz form action')
            if not markup.headings:
                result['errors'].append('no rendered headings')
    except urllib.error.HTTPError as exc:
        result['status'] = exc.code
        result['errors'].append('HTTP error')
    except Exception as exc:
        result['errors'].append(type(exc).__name__ + ': ' + str(exc))
    result['elapsedSeconds'] = round(time.monotonic() - started, 3)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://localhost:3100')
    parser.add_argument('--content', type=pathlib.Path, default=pathlib.Path('examples/allianz-life/content/native-content.json'))
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    parsed = urllib.parse.urlparse(args.base_url)
    if parsed.hostname not in ('localhost', '127.0.0.1', '::1') and not (parsed.scheme == 'https' and (parsed.hostname or '').endswith('.vercel.app')):
        parser.error('Only local or explicitly supplied HTTPS Vercel hosts are allowed')
    if parsed.path not in ('', '/') or parsed.query or parsed.username or parsed.password:
        parser.error('Use an origin without credentials, path or query')
    routes = sorted(json.loads(args.content.read_text())['routes'])
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 6))) as pool:
        results = list(pool.map(lambda path: audit(args.base_url.rstrip('/'), path), routes))
    report = {
        'baseUrl': args.base_url,
        'routeCount': len(routes),
        'passed': sum(item['status'] == 200 and not item['errors'] for item in results),
        'failed': sum(item['status'] != 200 or bool(item['errors']) for item in results),
        'visualAcceptance': False,
        'formSubmissions': 0,
        'routes': results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'routes'}))
    return 0 if report['failed'] == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
