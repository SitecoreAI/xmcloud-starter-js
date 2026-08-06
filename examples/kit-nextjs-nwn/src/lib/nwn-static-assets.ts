import communityTreePlantingAsset from '../../public/assets/nwn-images/about-community-tree-planting-landscape.png';
import cookingWithGasAsset from '../../public/assets/nwn-images/cooking-with-gas-home-chef-landscape.png';
import headerLogoLightAsset from '../../public/assets/nwn-images/global-header-nw-natural-logo-light.png';
import heroBillAssistanceAsset from '../../public/assets/nwn-images/homepage-hero-bill-assistance-wide.png';
import heroCall811Asset from '../../public/assets/nwn-images/homepage-hero-call-811-before-you-dig-wide.png';
import heroFamilyComfortAsset from '../../public/assets/nwn-images/homepage-hero-family-comfort-pacific-northwest-wide.png';
import heroManageAccountAsset from '../../public/assets/nwn-images/homepage-hero-manage-account-24-7-wide.png';
import rebatesFurnaceAsset from '../../public/assets/nwn-images/rebates-high-efficiency-furnace-landscape.png';
import smellGasSafetyAsset from '../../public/assets/nwn-images/safety-smell-gas-call-from-outside-landscape.png';

/**
 * Static imports are emitted under `/_next/static/media`, which stays
 * available inside the Sitecore editing host. The public path supports test
 * and local tooling that represents an imported image as a plain string.
 */
const bundledSource = (asset: unknown, publicPath: string): string => {
  if (
    typeof asset === 'object' &&
    asset !== null &&
    'src' in asset &&
    typeof (asset as { src?: unknown }).src === 'string'
  ) {
    return (asset as { src: string }).src;
  }

  return publicPath;
};

export const nwnImageSources = {
  communityTreePlanting: bundledSource(
    communityTreePlantingAsset,
    '/assets/nwn-images/about-community-tree-planting-landscape.png',
  ),
  cookingWithGas: bundledSource(
    cookingWithGasAsset,
    '/assets/nwn-images/cooking-with-gas-home-chef-landscape.png',
  ),
  headerLogoLight: bundledSource(
    headerLogoLightAsset,
    '/assets/nwn-images/global-header-nw-natural-logo-light.png',
  ),
  heroBillAssistance: bundledSource(
    heroBillAssistanceAsset,
    '/assets/nwn-images/homepage-hero-bill-assistance-wide.png',
  ),
  heroCall811: bundledSource(
    heroCall811Asset,
    '/assets/nwn-images/homepage-hero-call-811-before-you-dig-wide.png',
  ),
  heroFamilyComfort: bundledSource(
    heroFamilyComfortAsset,
    '/assets/nwn-images/homepage-hero-family-comfort-pacific-northwest-wide.png',
  ),
  heroManageAccount: bundledSource(
    heroManageAccountAsset,
    '/assets/nwn-images/homepage-hero-manage-account-24-7-wide.png',
  ),
  rebatesFurnace: bundledSource(
    rebatesFurnaceAsset,
    '/assets/nwn-images/rebates-high-efficiency-furnace-landscape.png',
  ),
  smellGasSafety: bundledSource(
    smellGasSafetyAsset,
    '/assets/nwn-images/safety-smell-gas-call-from-outside-landscape.png',
  ),
} as const;
