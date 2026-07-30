import { hasDistinctHeroCopy, hasRenderableHeroCta } from '@/lib/hero-copy';

describe('hasDistinctHeroCopy', () => {
  it('returns false for empty banner copy', () => {
    expect(hasDistinctHeroCopy({ value: '' }, { value: 'A clear title' })).toBe(
      false,
    );
  });

  it('returns false when banner copy repeats another hero field', () => {
    expect(
      hasDistinctHeroCopy(
        { value: '  Built for your most consequential matters ' },
        { value: 'Built for your MOST consequential matters.' },
      ),
    ).toBe(false);
  });

  it('returns true for distinct banner copy', () => {
    expect(
      hasDistinctHeroCopy(
        { value: 'Explore our services' },
        { value: 'Built for your most consequential matters.' },
      ),
    ).toBe(true);
  });
});

describe('hasRenderableHeroCta', () => {
  it('returns true for a complete link rendered by ButtonBase', () => {
    expect(
      hasRenderableHeroCta({
        value: {
          href: '/services',
          text: 'Explore our services',
          linktype: 'internal',
        },
      }),
    ).toBe(true);
  });

  it.each([
    {
      value: {
        href: '',
        text: 'Explore our services',
        linktype: 'internal',
      },
    },
    {
      value: {
        href: 'http://',
        text: 'Explore our services',
        linktype: 'external',
      },
    },
    {
      value: {
        url: '/services',
        text: 'Explore our services',
        linktype: 'internal',
      },
    },
    {
      value: {
        href: '/services',
        text: '   ',
        linktype: 'internal',
      },
    },
  ])('returns false for an incomplete or placeholder link', (link) => {
    expect(hasRenderableHeroCta(link)).toBe(false);
  });
});
