/**
 * Permanent public links for the approved SLB Content Hub collection.
 *
 * Keep filenames as the stable content key so English and es-MX can share the
 * same approved visual while supplying locale-specific alt text.
 */
export const slbDamAssetUrls: Readonly<Record<string, string>> = {
  'about-global-presence.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/cf4eb169e1b1446e856beff28b32e8ba?v=e05649fd',
  'about-innovation-factori.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/0a1047b1dee34b23a679a68c20bfe340?v=479695bf',
  'about-technology-center-team.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/cc927e59517c4abea5cf912e0bccc5a6?v=96e5ca01',
  'home-collaborative-workplace.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/78c08584a221494b87ed7b84df318dfa?v=cdcff087',
  'home-decarbonizing-industry.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/44bbbb788f354b81ae644a9d658ddc88?v=93f6bac3',
  'home-digital-at-scale.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/62c654cc341b43b882000c2f6da5dbd6?v=908be320',
  'home-energy-infrastructure.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/2a769a236a594bc1845bc00e2c779366?v=8dcdc8aa',
  'home-precision-engineering.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/c1a62aad5a4e41ca94c2500ddcdc4937?v=1423fd76',
  'home-scaling-new-energy.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/1ae6355316334fa9a7a59c39e49aec17?v=610e91ff',
  'news-artificial-lift-technologies.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/32f9780b98fd4220b8341ba054cd9876?v=15e17612',
  'news-havstjerne-carbon-storage.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/d5f0c97ab6414002a1e142a8545dc6eb?v=c4965d50',
  'news-shreveport-infrastructure.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/e57e8c20cc1d4a2dab807a1cb7f68855?v=6d6baced',
  'products-intelligent-power-management.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/d66ec98fff2a41b788e75bccb6dd1e03?v=cd82516e',
  'products-lumi-platform.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/b532b99df85942c094b5a722f21ef474?v=c5e54fb9',
  'products-reda-agile-esp.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/a3723703457348628590566723cb8d31?v=2f9349c3',
  'products-tela-ai.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/e61335aa778b4f6ba7f6a9a5991d9e71?v=0384cead',
  'products-test-facility.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/7aa8313a9fa94515a7263f44365b92f5?v=ff2959ab',
  'slb-logo-positive-blue.svg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/6c243fbaffa74bf2b8b8d038894409cd?v=2d0f1d15',
  'solutions-laboratory-innovation.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/08a492d75a934bfda09d4442a41110f6?v=8e648053',
  'solutions-local-expertise.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/d53f6d8164f642a88bfb94298b1b88aa?v=17f5a1fe',
  'solutions-manufacturing-expertise.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/023a9a92f1cf4fe4bcda3d14c5afc5ed?v=09537d80',
  'sustainability-climate-action.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/5b1acb1d70354188a82197b0eff1160f?v=5c4a425b',
  'sustainability-field-employee.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/bfc29d5f125e436990d32e15478376c4?v=0d143fe3',
  'sustainability-iceland-road.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/deb4539c4b574baead4937f89ced24a5?v=5ca1f1b5',
  'sustainability-nature.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/830f2bc695e94a23bc15d1be81e8eb01?v=456e9b34',
  'sustainability-our-people.jpg':
    'https://thlt-demo.sitecoresandbox.cloud/api/public/content/c82bfc918bbe4d54b43aa9f2822c17a2?v=c3205c73',
};

export function getSlbDamAssetUrl(filename: string): string {
  return slbDamAssetUrls[filename] ?? `/images/slb/${filename}`;
}
