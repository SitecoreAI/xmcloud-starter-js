'use client';
import type React from 'react';
import type { ImageCarouselProps } from './image-carousel.props';
import { ImageCarouselDefault } from './ImageCarouselDefault.dev';
import { ImageCarouselLeftRightPreview } from './ImageCarouselLeftRightPreview.dev';
import { ImageCarouselFullBleed } from './ImageCarouselFullBleed.dev';
import { ImageCarouselPreviewBelow } from './ImageCarouselPreviewBelow.dev';
import { ImageCarouselFeaturedImageLeft } from './ImageCarouselFeaturedImageLeft.dev';
import {
  ImageCarouselNwnHome,
  ImageCarouselNwnResources,
} from './ImageCarouselNwnResources.dev';
import { ImageCarouselNwnHero } from './ImageCarouselNwnHero.dev';

// Data source checks are done in the child components

// Default display of the component
export const Default: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <ImageCarouselNwnResources {...props} isPageEditing={isEditing} />;
};

export const StarterDefault: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <ImageCarouselDefault {...props} isPageEditing={isEditing} />;
};

// Variants
export const LeftRightPreview: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <ImageCarouselLeftRightPreview {...props} isPageEditing={isEditing} />;
};

export const FullBleed: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <ImageCarouselFullBleed {...props} isPageEditing={isEditing} />;
};

export const PreviewBelow: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;
  return <ImageCarouselPreviewBelow {...props} isPageEditing={isEditing} />;
};

export const FeaturedImageLeft: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;
  return (
    <ImageCarouselFeaturedImageLeft {...props} isPageEditing={isEditing} />
  );
};

export const NwnHome: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <ImageCarouselNwnHome {...props} isPageEditing={isEditing} />;
};

export const NwnResources: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <ImageCarouselNwnResources {...props} isPageEditing={isEditing} />;
};

export const NwnHero: React.FC<ImageCarouselProps> = (props) => {
  const { isEditing } = props.page.mode;

  return <ImageCarouselNwnHero {...props} isPageEditing={isEditing} />;
};
