'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { Image, Link, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { AllianzFieldIcon } from 'lib/allianz-field-icon';
import { safeLinkRenderProps } from 'lib/allianz-fields';
import type { AllianzParticipantHeaderProps } from './allianz-participant-header.props';
import './AllianzParticipantHeader.css';

/** Participant utility chrome. It is selected by a dedicated native partial design. */
export const Default = ({ fields, params = {} }: AllianzParticipantHeaderProps) => {
  const [open, setOpen] = useState(false);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzParticipantHeader" />;
  return <header id={params.RenderingIdentifier}
    className={`O-azl-header allianz-participant-header${open ? ' m-navigation-primary-open' : ''}`}>
    <div className="m-navigationUtilityWrapper"><div className="l-container">
      <nav className="m-navigationUtility" aria-label="Utility navigation">
        <ul className="azl-nav-list logo-name">
          <li className="logo-icon"><NextLink href="/" aria-label="Allianz Life home"><Image field={data.logo?.jsonValue} /></NextLink></li>
          <li><Text field={data.tagline?.jsonValue} /></li>
        </ul>
        <ul className="azl-nav-list">{(data.utilityNav?.targetItems ?? []).map((item) => <li key={item.id}>
          <Link {...safeLinkRenderProps(item.link?.jsonValue)} className="a-link">
            <span className="a-link__icon"><AllianzFieldIcon field={item.icon?.jsonValue} decorative /></span>
            <span className="a-link__text"><Text field={item.title?.jsonValue} /></span>
          </Link>
        </li>)}</ul>
      </nav>
    </div></div>
    <div className="header-wrapper l-container">
      <div className="a-logo__svgLogo"><NextLink href="/" className="c-header__logo js-header__logo" aria-label="Allianz Life home"><Image field={data.logo?.jsonValue} /></NextLink></div>
      {/* The source participant shell has no primary menu behind this control. */}
      <button type="button" className="m-navigation-mobile-btn c-header__navigation-desktop-hide"
        aria-label="Menu" aria-pressed={open} onClick={() => setOpen((current) => !current)}>
        <i aria-hidden="true" className="c-icon c-icon--functional c-icon--bars" />
      </button>
    </div>
  </header>;
};
