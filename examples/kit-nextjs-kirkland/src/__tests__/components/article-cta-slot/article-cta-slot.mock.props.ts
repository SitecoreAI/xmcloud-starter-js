import { testComponentMap } from '@/__tests__/test-utils/component-props';
import { Page } from '@sitecore-content-sdk/nextjs';

const createPage = (isEditing: boolean): Page =>
  ({
    mode: {
      isEditing,
      isPreview: false,
      isNormal: !isEditing,
      name: isEditing ? 'edit' : 'normal',
      designLibrary: { isVariantGeneration: false },
      isDesignLibrary: false,
    },
    layout: {
      sitecore: {
        context: {},
        route: null,
      },
    },
    locale: 'en',
  }) as Page;

export const populatedArticleCtaSlotProps = {
  rendering: {
    componentName: 'ArticleCtaSlot',
    placeholders: {
      'kirkland-article-cta-main': [{ componentName: 'CtaBanner' }],
    },
  },
  params: {
    DynamicPlaceholderId: 'main',
    styles: 'custom-article-cta-slot',
  },
  page: createPage(false),
  componentMap: testComponentMap,
};

export const emptyArticleCtaSlotProps = {
  rendering: {
    componentName: 'ArticleCtaSlot',
    placeholders: {},
  },
  params: {
    DynamicPlaceholderId: 'empty',
  },
  page: createPage(false),
  componentMap: testComponentMap,
};

export const emptyEditingArticleCtaSlotProps = {
  ...emptyArticleCtaSlotProps,
  page: createPage(true),
};
