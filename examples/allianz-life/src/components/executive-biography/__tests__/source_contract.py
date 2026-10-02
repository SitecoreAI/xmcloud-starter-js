#!/usr/bin/env python3
"""Self-contained DOM oracle for exact captured biography source.

No discovery directory or normalized semantic candidates are used by tests.
"""
import base64
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
DROP = set('script style form input button select textarea iframe noscript object embed'.split())

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

def sections(root):
    main=root.find(tag='main')
    return main.children() if main else root.children()

def parts(kind, root):
    nodes=sections(root)
    if kind=='ExecutiveBiography':
        return [n for n in nodes if n.has('t-bg-transparent')][:2]
    if kind=='ExpertBiography':
        return [next(n for n in nodes if n.has('t-bg-transparent'))]
    if kind=='BiographyDisclosures':
        return [n for n in nodes if n.has('t-bg-grey-muted')]
    return [next(n for n in nodes if n.has('a-axlDisclosures'))]

def capture_source(record, checkout_bytes=None):
    raw=base64.b64decode(record['fragmentBase64'],validate=True)
    if hashlib.sha256(raw).hexdigest()!=record['fragmentSha256']: raise AssertionError('Raw source fragment digest mismatch')
    source=raw.decode('utf-8')
    checkout=(HERE/record['fragmentFile']).read_bytes() if checkout_bytes is None else checkout_bytes
    readable=checkout.decode('utf-8').replace('\r\n','\n')
    canonical=source.replace('\r\n','\n')
    if digest(readable)!=record['fragmentLfSha256'] or readable!=canonical: raise AssertionError('Readable capture content mismatch beyond checkout EOL')
    return source

def skeleton(kind,source):
    def outline(n):
        cs=[c for c in n.attrs.get('class','').split() if c not in {'component','executive-biography','expert-biography','biography-disclosures','legal-disclosures'}]
        if n.has('tileBody') or n.has('disclosure'): children=['AUTHORED-HTML']
        elif n.tag=='h1': children=['PERSON-NAME']
        elif n.tag in {'h2','h4','h5'} and n.parent.has('tileSubHeading'): children=['ROLE-HTML']
        elif n.tag=='div' and n.parent.has('tileSubHeading') and any(n.has(c) for c in {'executive-biography-role','expert-biography-role'}):
            # Only the explicit valid Rich Text role wrapper maps to its source heading.
            expected='h2' if n.has('h2') else 'h4' if n.has('h4') else 'h5' if n.has('h5') else None
            if expected is None or n.attrs.get('role')!='heading' or n.attrs.get('aria-level')!=expected[1:]: raise AssertionError('Invalid fixed biography role accommodation')
            if sorted(cs)!=sorted([expected,'executive-biography-role' if kind=='ExecutiveBiography' else 'expert-biography-role']): raise AssertionError('Unexpected role wrapper classes')
            return [expected,[],['ROLE-HTML']]
        elif n.has('a-link__text'): children=['LINK-TEXT']
        else: children=[outline(x) for x in n.children()]
        return [n.tag,cs,children]
    return [outline(n) for n in parts(kind,DOM(source).root)]

class SourceContractTests(unittest.TestCase):
    def test_readable_captures_survive_lf_and_crlf_checkout_without_changing_raw_source_or_field_values(self):
        records=json.loads((HERE/'manifest.json').read_text())['records']
        for r in records:
            raw=base64.b64decode(r['fragmentBase64'],validate=True)
            lf=raw.decode('utf-8').replace('\r\n','\n')
            self.assertEqual(capture_source(r,lf.encode()),raw.decode('utf-8'))
            self.assertEqual(capture_source(r,lf.replace('\n','\r\n').encode()),raw.decode('utf-8'))
            with self.assertRaises(AssertionError): capture_source(r,(lf+'unexpected content').encode())

    def test_all_captures_have_exact_independently_extracted_fields(self):
        manifest=json.loads((HERE/'manifest.json').read_text());records=manifest['records']
        self.assertEqual(len(records),41)
        self.assertEqual(len({r['route'] for r in records}),41)
        totals={'executives':0,'subject-matter-experts':0,'ventures':0}
        present=blankLegal=nonemptyLegal=greyCount=0
        for r in records:
            with self.subTest(route=r['route']):
                totals[r['sourceFamily']]+=1
                source=capture_source(r)
                self.assertEqual(digest(source),r['fragmentSha256'])
                root=DOM(source).root;nodes=sections(root);intro=nodes[0].find(css='m-axlIntroductionBlock')
                heading=intro.find(tag='h1');role=intro.find(css='tileSubHeading').children()[0];f=r['exactSourceFieldValues']
                self.assertEqual(f['name']['jsonValue']['value'],heading.text())
                self.assertEqual(f['role']['jsonValue']['value'],source_inner(role,source))
                self.assertEqual(classes(intro),'m-axlIntroductionBlock -is--stacked -no--image')
                self.assertEqual(classes(intro.children()[0]),'tileContent u-text-center')
                self.assertEqual(classes(nodes[0].find(css='l-grid__row')),'l-grid__row u-margin-bottom-lg u-padding-top-lg')
                image=nodes[0].find(tag='img');present+=image is not None
                self.assertEqual(r['sourcePortrait'],image.attrs if image else None)
                self.assertEqual(f['portrait']['jsonValue']['value'],{'src':image.attrs['src'],'alt':image.attrs.get('alt','')} if image else {})
                if r['sourceFamily']=='executives':
                    self.assertEqual(set(f),{'name','role','portrait','biography','portraitLink'})
                    self.assertEqual([classes(n) for n in nodes[0].children()[0].children()[1].children()],['l-grid__column-medium-4']*3)
                    self.assertEqual(role.tag,'h2' if r['variant']=='ChiefExecutive' else 'h4')
                    self.assertEqual(nodes[0].has('u-row-spacing'),r['variant']=='ChiefExecutive')
                    self.assertEqual(nodes[1].has('l-container'),r['variant']=='Contained')
                    self.assertEqual(nodes[1].find(css='l-grid__row').has('u-margin-bottom-xl'),r['variant'] in {'Extended','Contained'})
                    self.assertEqual(f['biography']['jsonValue']['value'],source_inner(nodes[1].find(css='tileBody'),source))
                    link=nodes[0].find(tag='a');self.assertEqual(link is not None,r['variant']=='LinkedPortrait')
                    self.assertEqual(f['portraitLink']['jsonValue']['value'],{'href':link.attrs['href'],'linktype':'media','text':''} if link else {})
                else:
                    self.assertEqual(set(f),{'name','role','focus','portrait','biography','downloadLink'})
                    self.assertEqual(role.tag,'h5')
                    tile=nodes[0].find(css='m-axlTile')
                    self.assertEqual(classes(tile),'m-axlTile match-height tile--6633 -is--flipped -is--split t-bg-blue-soft')
                    self.assertEqual(tile.find(css='tileHeading').find(tag='h3').text(),'Focused on:')
                    self.assertEqual(f['focus']['jsonValue']['value'],source_inner(tile.find(css='tileBody'),source))
                    bio=tile.parent.children()[1]
                    self.assertEqual(f['biography']['jsonValue']['value'],source_inner(bio.find(css='tileBody'),source))
                    link=bio.find(css='a-link');self.assertIsNotNone(link)
                    self.assertEqual(f['downloadLink']['jsonValue']['value'],{'href':link.attrs['href'],'target':link.attrs.get('target',''),'text':link.find(css='a-link__text').text(),'linktype':'media'})
                    self.assertEqual(link.attrs['aria-label'],'Download bio')
                    if image:
                        self.assertEqual(classes(image),'c-image__img c-teaser__image-img')
                        self.assertEqual(image.attrs['sizes'],'100vw')
                        self.assertEqual(len(image.attrs['srcset'].split(',')),5)
                for name,value in f.items():
                    if isinstance(value['jsonValue']['value'],str): self.assertEqual(digest(value['jsonValue']['value']),r['sourceCopySha256'][name])
                self.assertEqual(len([x for x in DOM(f['biography']['jsonValue']['value']).root.descendants() if x.tag=='h3']),3)
                legal=nodes[-1]
                self.assertEqual(classes(legal),'l-container--full-width a-axlDisclosures')
                self.assertEqual(classes(legal.find(css='disclosure')),'col-md-12 content-body disclosure')
                self.assertEqual(r['legalDisclosures']['body']['jsonValue']['value'],source_inner(legal.find(css='disclosure'),source))
                if legal.text(): nonemptyLegal+=1
                else: blankLegal+=1
                greys=[x for x in nodes if x.has('t-bg-grey-muted')];greyCount+=len(greys)
                self.assertEqual(len(greys),len(r['biographyDisclosures']))
                for node,fields in zip(greys,r['biographyDisclosures']):
                    self.assertEqual(classes(node),'l-container--full-width t-bg-grey-muted axlTileCollection')
                    self.assertEqual(fields['body']['jsonValue']['value'],source_inner(node.find(css='tileBody'),source))
        self.assertEqual(totals,{'executives':8,'subject-matter-experts':29,'ventures':4})
        self.assertEqual((present,nonemptyLegal,blankLegal,greyCount),(37,29,12,3))

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='skeleton': print(json.dumps(skeleton(sys.argv[2],sys.stdin.read())))
    elif len(sys.argv)>1 and sys.argv[1]=='role':
        root=DOM(sys.stdin.read()).root
        wrappers=[n for n in root.descendants() if n.has('expert-biography-role') or n.has('executive-biography-role')]
        if len(wrappers)!=1: raise AssertionError('Expected one mounted native role field')
        n=wrappers[0]
        if n.tag!='div' or n.attrs.get('role')!='heading': raise AssertionError('Role must be a valid block-safe heading wrapper')
        expected='h'+n.attrs.get('aria-level','')
        if expected not in {'h2','h4','h5'} or not n.has(expected): raise AssertionError('Role must use fixed source typography and semantic heading level')
        print(json.dumps({'tag':n.tag,'class':classes(n),'role':n.attrs['role'],'ariaLevel':n.attrs['aria-level'],'directChildren':[x.tag for x in n.children()]}))
    else: unittest.main()
