#!/usr/bin/env python3
"""Self-contained DOM oracle for exact captured newsroom source.

No discovery directory or normalized semantic candidates are used by tests.
"""
import hashlib
import json
import re
import sys
import unittest
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
DROP = set('script style form input button select textarea iframe noscript object embed svg'.split())

@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    content: list = field(default_factory=list)
    parent: object = None
    start: int = 0
    end: int = 0
    def children(self): return [n for n in self.content if isinstance(n, Node)]
    def descendants(self):
        for n in self.children():
            yield n
            yield from n.descendants()
    def has(self, css): return css in self.attrs.get('class', '').split()
    def find(self, css=None, tag=None):
        return next((n for n in self.descendants() if (css is None or n.has(css)) and (tag is None or n.tag == tag)), None)
    def text(self):
        if self.tag in DROP: return ''
        return re.sub(r'\s+', ' ', ' '.join(n.text() if isinstance(n, Node) else n for n in self.content)).strip()

class DOM(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.offsets = [0]
        for match in re.finditer('\n', source): self.offsets.append(match.end())
        self.root = Node('root'); self.stack = [self.root]
        self.feed(source)
    def source_offset(self):
        row, column = self.getpos(); return self.offsets[row-1]+column
    def handle_starttag(self, tag, attrs):
        if tag in {'p', 'li'} and self.stack[-1].tag == tag:
            self.stack[-1].end = self.source_offset(); self.stack.pop()
        n = Node(tag, dict((k,v or '') for k,v in attrs), parent=self.stack[-1], start=self.source_offset())
        self.stack[-1].content.append(n)
        if tag not in VOID: self.stack.append(n)
        else: n.end = self.source_offset()+len(self.get_starttag_text())
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:
            self.stack[-1].end = self.source_offset()+len(self.get_starttag_text()); self.stack.pop()
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag == tag:
                self.stack[i].end = self.source.find('>',self.source_offset())+1
                self.stack = self.stack[:i]; break
    def handle_data(self, data): self.stack[-1].content.append(data)

def classes(node): return ' '.join(node.attrs.get('class','').split())
def digest(value): return hashlib.sha256(value.encode()).hexdigest()
def source_inner(node, source):
    return source[source.find('>', node.start)+1:source.rfind('</',node.start,node.end)]

def parts(root):
    intro = root.find(css='m-azlIntroductionBlock')
    if not intro: raise AssertionError('Missing source PressRelease introduction')
    column = intro.parent; row = column.parent; grid = row.parent; section = grid.parent
    siblings = section.parent.children(); index = siblings.index(section)
    return section, siblings[index+1], siblings[index+2]

def skeleton(kind, source):
    root = DOM(source).root
    if kind == 'PressRelease': node = root.find(css='m-azlIntroductionBlock').parent.parent.parent.parent
    elif kind == 'NewsroomReturn': node = root.find(css='m-axlIntroductionBlock').parent.parent.parent.parent
    else: node = root.find(css='a-axlDisclosures')
    def outline(n):
        cs = [c for c in n.attrs.get('class','').split() if c not in {'component','press-release','newsroom-return','legal-disclosures'}]
        if kind == 'PressRelease' and n is node.children()[0].children()[0].children()[1]: children = ['BODY']
        elif kind == 'LegalDisclosures' and n.has('disclosure'): children = ['BODY']
        elif n.tag == 'h1': children = ['TITLE']
        elif n.has('tileSubHeading') and kind == 'PressRelease': children = ['SUMMARY']
        elif n.tag == 'svg': children = ['FIXED-ARROW']
        elif n.has('a-link__text'): children = ['LINK-TEXT']
        else: children = [outline(c) for c in n.children()]
        return [n.tag, cs, children]
    return outline(node)

class SourceContractTests(unittest.TestCase):
    def test_all_captured_sources_have_the_fixed_design_and_exact_authored_html(self):
        records=json.loads((HERE/'manifest.json').read_text())['records']
        self.assertEqual(len(records),81)
        expected=None
        for r in records:
            with self.subTest(route=r['route']):
                source=(HERE/r['fragmentFile']).read_text()
                self.assertEqual(digest(source),r['fragmentSha256'])
                release,ret,legal=parts(DOM(source).root)
                shape=skeleton('PressRelease',source)
                if expected is None: expected=shape
                self.assertEqual(shape,expected)
                self.assertEqual(classes(release),'l-container')
                grid=release.children()[0];self.assertEqual(classes(grid),'l-grid l-grid--max-width l-grid--no-gutters')
                row=grid.children()[0];self.assertEqual(classes(row),'l-grid__row u-margin-bottom-xl')
                self.assertEqual([classes(n) for n in row.children()],['l-grid__column-medium-12']*2)
                intro=row.children()[0].children()[0]
                self.assertEqual(classes(intro),'m-azlIntroductionBlock -is--stacked -no--image')
                self.assertEqual(classes(intro.children()[0]),'tileContent u-text-left')
                self.assertEqual(intro.find(css='tileHeading').children()[0].tag,'h1')
                self.assertEqual([n.tag for n in intro.find(css='tileSubHeading').children()],['h4'])
                self.assertEqual(set(r['exactSourceFieldValues']),{'title','summary','body'})
                self.assertEqual(r['exactSourceFieldValues']['title']['jsonValue']['value'], intro.find(css='tileHeading').find(tag='h1').text())
                self.assertEqual(r['exactSourceFieldValues']['summary']['jsonValue']['value'], source_inner(intro.find(css='tileSubHeading'),source))
                self.assertEqual(r['exactSourceFieldValues']['body']['jsonValue']['value'], source_inner(row.children()[1],source))
                self.assertEqual(r['exactSourceLegalBody']['jsonValue']['value'], source_inner(legal.find(css='disclosure'),source))
                self.assertFalse(any(n.tag in {'img','time'} for n in intro.descendants()))
                self.assertEqual(DOM(r['exactSourceFieldValues']['body']['jsonValue']['value']).root.text(),row.children()[1].text())
                self.assertEqual(DOM(r['exactSourceFieldValues']['summary']['jsonValue']['value']).root.text(),intro.find(css='tileSubHeading').text())
                self.assertEqual(len([n for n in ret.descendants() if n.tag=='a']),1)
                spacer=ret.find(css='tileBody')
                self.assertEqual(spacer.children(),[])
                self.assertEqual(''.join(spacer.content).strip(' \t\r\n'),'\u00a0')
                self.assertEqual(set(r['newsroomReturn']),{'link'})
                self.assertEqual(classes(legal),'l-container--full-width a-axlDisclosures')
                self.assertEqual(classes(legal.find(css='disclosure')),'col-md-12 content-body disclosure')
                self.assertNotIn('publishedDate',r['exactSourceFieldValues'])

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='skeleton':
        kind=sys.argv[2];print(json.dumps(skeleton(kind,sys.stdin.read())))
    else: unittest.main()
