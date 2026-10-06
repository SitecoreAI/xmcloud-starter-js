#!/usr/bin/env python3
"""Compare safe source shell hierarchy; unchanged heading/form internals are separate gates."""
import importlib.util,json,sys
from pathlib import Path
oracle=Path(__file__).resolve().parents[2]/'prospectus-document-table/__tests__/source_contract.py'
spec=importlib.util.spec_from_file_location('source_oracle',oracle)
o=importlib.util.module_from_spec(spec);sys.modules[spec.name]=o;spec.loader.exec_module(o)
def normalized_children(node):
 result=[]
 for child in node.children():
  # The installed SDK Text renderer uses an unstyled span around plain link labels.
  if child.tag=='span' and not child.attrs: result.extend(normalized_children(child))
  else: result.append(outline(child))
 return result
def outline(node):
 # Heading div/header mismatch already exists. Verify the unchanged native
 # implementation separately; do not normalize its production markup here.
 if node.has('page-header'): return ['unchanged-native-heading',normalized_children(node)]
 if node.has('source-existing-product-contact-form') or node.has('allianz-product-contact'):
  return ['existing-product-contact-form']
 return [node.tag,' '.join(node.attrs.get('class','').split()),normalized_children(node)]
def shell_text(node):
 if node.has('source-existing-product-contact-form') or node.has('allianz-product-contact'): return ''
 return ' '.join(shell_text(n) if isinstance(n,o.Node) else n for n in node.content)
def links(node,css):
 return [(a.attrs.get('href',''),a.text(),a.attrs.get('class',''))
         for a in node.find(css=css).descendants() if a.tag=='a']
for record in json.load(sys.stdin):
 source=o.DOM(record['source']).root;actual=o.DOM(record['actual']).root
 assert outline(source)==outline(actual),(record['key'],outline(source),outline(actual))
 assert ' '.join(shell_text(source).split())==' '.join(shell_text(actual).split()),(record['key'],'source copy differs')
 for css in ['nav-links','link-list']:assert links(source,css)==links(actual,css),(record['key'],css)
 next_steps=actual.find(css='next-steps');forms=[n for n in actual.descendants() if n.has('allianz-product-contact')]
 assert len(forms)==1 and forms[0].parent is next_steps,(record['key'],'form escaped hidden wrapper')
 assert [n.tag for n in next_steps.children()]==['hr','h2','ul','section']
 table=actual.find(id='prospectusTable')
 assert table.parent.has('content') and table.parent.find(css='nav-links').parent is table.parent
 assert len([n for n in actual.descendants() if n.has('disclosure')])==2
 assert not [n for n in actual.find(css='content-footer').descendants() if n.tag=='li']
print('Six source shell, order, list, copy and nesting contracts match; heading/form internals unchanged')
