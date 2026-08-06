'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  House,
  Pause,
  Play,
  ShieldCheck,
} from 'lucide-react';
import type { ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import { Text } from '@sitecore-content-sdk/nextjs';
import { ButtonBase } from '@/components/button-component/ButtonComponent';
import { Default as ImageWrapper } from '@/components/image/ImageWrapper.dev';
import { Button } from '@/components/ui/button';
import { useMatchMedia } from '@/hooks/use-match-media';
import { cn } from '@/lib/utils';
import { NoDataFallback } from '@/utils/NoDataFallback';
import type { HeroProps } from './hero.props';

const fallbackSlides = [
  {
    eyebrow: 'For your home. For your business. For our region.',
    title: 'Comfort starts at home.',
    description:
      'Reliable natural gas helps make everyday moments warm, comfortable and convenient.',
    image:
      '/assets/nwn-images/homepage-hero-family-comfort-pacific-northwest-wide.png',
    href: '/get-natural-gas/benefits',
    linkText: 'Explore the benefits of natural gas',
  },
  {
    eyebrow: 'Dig safely',
    title: 'Call 811 before you dig.',
    description:
      'A free utility locate helps protect you, your neighbors and underground lines.',
    image: '/assets/nwn-images/homepage-hero-call-811-before-you-dig-wide.png',
    href: '/safety/call-before-you-dig',
    linkText: 'Plan a safe project',
  },
  {
    eyebrow: 'We are here to help',
    title: 'Help to manage energy costs.',
    description:
      'Explore bill discounts, payment plans and weatherization resources designed to help.',
    image: '/assets/nwn-images/homepage-hero-bill-assistance-wide.png',
    href: '/account-billing/payment-assistance',
    linkText: 'Find payment assistance',
  },
  {
    eyebrow: 'Anytime account access',
    title: 'Manage your account 24/7.',
    description:
      'Pay a bill, view energy use and update your service from wherever you are.',
    image: '/assets/nwn-images/homepage-hero-manage-account-24-7-wide.png',
    href: '/account-billing/pay-my-bill',
    linkText: 'Manage your account',
  },
] as const;

const taskCards = [
  {
    title: 'Make a payment',
    description: 'Pay online or review convenient payment options.',
    href: '/account-billing/pay-my-bill',
    icon: CreditCard,
  },
  {
    title: 'Safety at home',
    description: 'Know the signs of a gas leak and how to respond.',
    href: '/safety/smell-natural-gas',
    icon: ShieldCheck,
  },
  {
    title: 'Start, stop or transfer',
    description: 'Move natural gas service with a few simple steps.',
    href: '/account-billing/start-stop-transfer',
    icon: House,
  },
] as const;

const isLegacyStarterContent = (value: string | undefined): boolean =>
  Boolean(
    value &&
      /alaris|aero|terra|nexa|vehicle|automotive|test drive|test-drive|electric future|experienced car|drivesense/i.test(
        value,
      ),
  );

const fallbackImage = (index: number): ImageField => ({
  value: {
    src: fallbackSlides[index].image,
    alt: fallbackSlides[index].title,
    width: '1600',
    height: '760',
  },
});

const fallbackLink = (index: number): LinkField => ({
  value: {
    href: fallbackSlides[index].href,
    text: fallbackSlides[index].linkText,
    linktype: 'internal',
  },
});

type DisplaySlide = {
  eyebrow: string;
  title: string;
  description: string;
  image: ImageField;
  primaryLink: LinkField;
  secondaryLink?: LinkField;
  isAuthored: boolean;
};

export const HeroNwnHome: React.FC<HeroProps> = (props) => {
  const { fields, isPageEditing } = props;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselId = useId();
  const isReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');

  const slides = useMemo<DisplaySlide[]>(() => {
    if (!fields) return [];

    const authoredImage = fields.image?.value?.src;
    const hasLegacyContent = [
      fields.bannerText?.value,
      fields.title?.value,
      fields.description?.value,
      fields.image?.value?.src,
      fields.image?.value?.alt,
      fields.bannerCTA?.value?.href,
      fields.bannerCTA?.value?.text,
      fields.searchLink?.value?.href,
      fields.searchLink?.value?.text,
    ].some(isLegacyStarterContent);
    const useAuthoredContent = isPageEditing || !hasLegacyContent;
    const firstSlide: DisplaySlide = {
      eyebrow:
        useAuthoredContent && fields.bannerText?.value
          ? fields.bannerText.value
          : fallbackSlides[0].eyebrow,
      title:
        useAuthoredContent && fields.title?.value
          ? fields.title.value
          : fallbackSlides[0].title,
      description:
        useAuthoredContent && fields.description?.value
          ? fields.description.value
          : fallbackSlides[0].description,
      image:
        useAuthoredContent &&
        authoredImage &&
        !isLegacyStarterContent(authoredImage)
          ? fields.image
          : fallbackImage(0),
      primaryLink:
        useAuthoredContent && fields.bannerCTA?.value?.href
          ? fields.bannerCTA
          : fallbackLink(0),
      secondaryLink:
        useAuthoredContent && fields.searchLink?.value?.href
          ? fields.searchLink
          : undefined,
      isAuthored: useAuthoredContent,
    };

    return [
      firstSlide,
      ...fallbackSlides.slice(1).map<DisplaySlide>((slide, fallbackIndex) => {
        const index = fallbackIndex + 1;
        return {
          eyebrow: slide.eyebrow,
          title: slide.title,
          description: slide.description,
          image: fallbackImage(index),
          primaryLink: fallbackLink(index),
          isAuthored: false,
        };
      }),
    ];
  }, [fields, isPageEditing]);

  useEffect(() => {
    if (isPageEditing || isPaused || isReducedMotion || slides.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % slides.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, [isPageEditing, isPaused, isReducedMotion, slides.length]);

  if (!fields) {
    return <NoDataFallback componentName="Hero" />;
  }

  const currentSlide = slides[currentIndex] || slides[0];
  const goToPrevious = () =>
    setCurrentIndex((index) => (index - 1 + slides.length) % slides.length);
  const goToNext = () =>
    setCurrentIndex((index) => (index + 1) % slides.length);

  return (
    <section
      data-component="Hero"
      data-variant="NwnHome"
      className={cn(
        'nwn-home-hero relative bg-[#f4f5f7] pb-14',
        props.params?.styles,
      )}
      aria-roledescription="carousel"
      aria-label="NW Natural featured information"
    >
      <div className="relative isolate min-h-[42rem] overflow-hidden bg-[#203c47] text-white">
        <ImageWrapper
          key={'nwn-home-slide-' + currentIndex}
          image={currentSlide.image}
          wrapperClass="absolute inset-0 -z-20 h-full w-full"
          className="h-full w-full object-cover object-center"
          priority={currentIndex === 0}
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
          fetchPriority={currentIndex === 0 ? 'high' : undefined}
          sizes="100vw"
          page={props.page}
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(9,35,45,0.94)_0%,rgba(9,35,45,0.70)_42%,rgba(9,35,45,0.12)_76%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-slate-950/45 to-transparent"
          aria-hidden="true"
        />

        <div className="nwn-content-shell flex min-h-[42rem] items-center py-20">
          <div
            role="group"
            aria-roledescription="slide"
            aria-label={currentIndex + 1 + ' of ' + slides.length}
            className="max-w-3xl pb-20 lg:pb-0"
          >
            {currentSlide.isAuthored && isPageEditing ? (
              <Text
                tag="p"
                field={fields.bannerText}
                className="mb-5 inline-flex border-l-4 border-cyan-400 pl-4 font-heading text-lg font-semibold uppercase tracking-[0.12em] text-cyan-100"
              />
            ) : (
              <p className="mb-5 inline-flex border-l-4 border-cyan-400 pl-4 font-heading text-lg font-semibold uppercase tracking-[0.12em] text-cyan-100">
                {currentSlide.eyebrow}
              </p>
            )}

            {currentSlide.isAuthored && isPageEditing ? (
              <Text
                tag="h1"
                field={fields.title}
                className="max-w-[13ch] text-balance font-heading text-[clamp(3.6rem,7vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.025em] text-white"
              />
            ) : (
              <h1 className="max-w-[13ch] text-balance font-heading text-[clamp(3.6rem,7vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.025em] text-white">
                {currentSlide.title}
              </h1>
            )}

            {currentSlide.isAuthored && isPageEditing ? (
              <Text
                tag="p"
                field={fields.description}
                className="mt-6 max-w-2xl text-pretty text-xl leading-8 text-white/95 sm:text-2xl"
              />
            ) : (
              <p className="mt-6 max-w-2xl text-pretty text-xl leading-8 text-white/95 sm:text-2xl">
                {currentSlide.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonBase
                buttonLink={currentSlide.primaryLink}
                isPageEditing={isPageEditing && currentSlide.isAuthored}
                variant="tertiary"
                className="min-h-12 border border-white bg-white px-6 text-base font-semibold text-primary hover:bg-cyan-50"
              />
              {currentSlide.secondaryLink && (
                <ButtonBase
                  buttonLink={currentSlide.secondaryLink}
                  isPageEditing={isPageEditing && currentSlide.isAuthored}
                  variant="ghost"
                  className="min-h-12 border border-white/80 px-6 text-base font-semibold text-white hover:bg-white/15 hover:text-white"
                />
              )}
            </div>
          </div>
        </div>

        <aside className="nwn-content-shell pb-24 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-16 lg:flex lg:justify-end lg:pb-0">
          <div className="pointer-events-auto w-full border-t-4 border-cyan-400 bg-slate-950/80 p-7 shadow-[0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:max-w-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Online account
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold text-white">
              Come on in.
            </h2>
            <p className="mt-3 text-base leading-7 text-white/85">
              View your bill, track energy use and manage account preferences.
            </p>
            <Button
              asChild
              variant="tertiary"
              className="mt-5 min-h-11 px-5 text-base"
            >
              <Link href="/account-billing/pay-my-bill">
                Access your account
              </Link>
            </Button>
          </div>
        </aside>

        <div className="absolute inset-x-0 bottom-24 z-10">
          <div className="nwn-content-shell flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              onClick={goToPrevious}
              aria-label="Previous slide"
              aria-controls={carouselId}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div
              id={carouselId}
              className="flex items-center gap-2"
              role="group"
              aria-label="Choose a slide"
            >
              {slides.map((slide, index) => (
                <button
                  type="button"
                  key={'nwn-slide-dot-' + index}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label={'Show slide ' + (index + 1) + ': ' + slide.title}
                  aria-current={index === currentIndex ? 'true' : undefined}
                  onClick={() => setCurrentIndex(index)}
                >
                  <span
                    className={
                      'h-2.5 rounded-full border border-white transition-[width,background-color] ' +
                      (index === currentIndex
                        ? 'w-5 bg-white'
                        : 'w-2.5 bg-white/20 hover:bg-white/60')
                    }
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              onClick={goToNext}
              aria-label="Next slide"
              aria-controls={carouselId}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            {!isReducedMotion && !isPageEditing && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={() => setIsPaused((paused) => !paused)}
                aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
              >
                {isPaused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Showing slide {currentIndex + 1} of {slides.length}:{' '}
          {currentSlide.title}
        </p>
      </div>

      <div className="nwn-content-shell relative z-20 -mt-16 grid overflow-hidden rounded bg-white shadow-[0_12px_24px_rgba(0,0,0,0.10)] md:grid-cols-3">
        {taskCards.map((task) => {
          const Icon = task.icon;
          return (
            <Link
              key={task.title}
              href={task.href}
              className="group border-b border-slate-200 p-6 transition-colors hover:bg-cyan-50 focus-visible:bg-cyan-50 md:border-b-0 md:border-r md:last:border-r-0 lg:p-8"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h2 className="font-heading text-2xl font-semibold text-primary">
                    {task.title}
                  </h2>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                    {task.description}
                  </p>
                </div>
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e4f4f7] text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
