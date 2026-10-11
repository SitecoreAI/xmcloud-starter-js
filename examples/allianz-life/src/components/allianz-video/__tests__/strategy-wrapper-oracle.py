"""Compare source presentation ancestry against the real rendered component."""
import json
import sys
from html.parser import HTMLParser


class Node:
    def __init__(self, tag, attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    @property
    def classes(self):
        return sorted(self.attrs.get('class', '').split())

    def find_class(self, name):
        if name in self.classes:
            return self
        for child in self.children:
            if isinstance(child, Node):
                found = child.find_class(name)
                if found is not None:
                    return found
        return None

    def canonical(self):
        attrs = dict(self.attrs)
        if 'class' in attrs:
            attrs['class'] = ' '.join(sorted(attrs['class'].split()))
        return [self.tag, attrs, [child.canonical() if isinstance(child, Node) else child
                                 for child in self.children if isinstance(child, Node) or child.strip()]]


class DOM(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        node.parent.children.append(node)
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)


def ancestry(node):
    result = []
    while node and node.tag != 'root':
        result.append((node.tag, node.classes))
        node = node.parent
    return result


packet = json.load(sys.stdin)
source = DOM(packet['source']).root
output = DOM(packet['output']).root
purpose = packet['purpose']
if purpose in {'footnotes', 'richtext'}:
    assert source.canonical() == output.canonical(), 'Strategy footnote shell/body differs from sealed source'
elif purpose == 'transcript':
    source_node = source.find_class('c-accordion')
    output_node = output.find_class('c-accordion')
    source_path = ancestry(source_node)
    source_path[0][1].remove('js-accordion')
    assert source_path == ancestry(output_node), 'Transcript source wrapper width/theme/spacing differs'
elif purpose == 'video':
    source_node = source.find_class('m-bcVideo')
    output_node = output.find_class('m-bcVideo')
    output_path = ancestry(output_node)
    output_path[0][1].remove('allianz-source-static-video')
    assert ancestry(source_node) == output_path, 'Static video source wrapper width/theme/spacing differs'
else:
    raise AssertionError('Unexpected source purpose')
