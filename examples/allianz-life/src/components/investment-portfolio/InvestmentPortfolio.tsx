'use client';

import { Image, Link, RichText, Text, useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { InvestmentEntry, InvestmentPortfolioResult } from 'lib/investment-portfolio-data';
import type { InvestmentPortfolioProps } from './investment-portfolio.props';
import { investmentWebsiteField } from './investment-portfolio-fields.props';
import './InvestmentPortfolio.css';

const InvestmentCard = ({ item, editing }: { item: InvestmentEntry; editing: boolean }) => {
  const link = investmentWebsiteField(item.websiteLink?.jsonValue);
  return <div className="l-grid__column-medium-3">
    <article className="m-axlTile match-height -is--flipped tile--stackedImage -is--stacked t-bg-transparent">
      <div className="tileContent u-text-left"><div className="tileSubGrid__content">
        <header><div className="tileHeading"><Text tag="h3" field={item.name?.jsonValue} editable={editing} /></div></header>
        {shouldRenderTextField(item.details?.jsonValue, editing) && <RichText tag="div" className="tileBody u-font-size-md" field={item.details?.jsonValue} editable={editing} />}
        {link && shouldRenderLinkField(link, editing) && (editing || Boolean(link.value?.text?.trim())) && <footer><div className="tileLink">
          <Link field={link} editable={editing} renderChildrenWhenEmpty={editing} className="a-link">
            <span aria-hidden="true" className="a-link__icon"><svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536" /></svg></span>
            <span className="a-link__text">{link.value?.text}</span>
          </Link>
        </div></footer>}
        {editing && item.websiteLink?.jsonValue?.value?.href && !link && <p role="status">Use a valid HTTP or HTTPS company link without embedded credentials.</p>}
        {editing && link?.value?.href && !link.value.text?.trim() && <p role="status">Add company link text so visitors have an accessible link label.</p>}
      </div></div>
      {shouldRenderImageField(item.logo?.jsonValue, editing) && <div className="tileImage"><picture className="c-image c-teaser__image">
        <Image field={item.logo?.jsonValue} editable={editing} alt={item.logo?.jsonValue?.value?.alt ?? ''} className="c-image__img c-teaser__image-img" />
      </picture></div>}
    </article>
  </div>;
};

export const Default = ({ fields, rendering, params }: InvestmentPortfolioProps) => {
  const { page } = useSitecore(), editing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  const automatic = useComponentProps<{ investmentPortfolio?: InvestmentPortfolioResult }>(rendering?.uid ?? '')?.investmentPortfolio;
  if (!data) return <NoDataFallback componentName="Investment Portfolio" />;
  const groups = [
    { key: 'Active', heading: data.activeHeading, items: automatic?.complete ? automatic.active : [] },
    { key: 'Exited', heading: data.exitedHeading, items: automatic?.complete ? automatic.exited : [] },
  ];
  return <div id={params?.RenderingIdentifier} className="investment-portfolio">
    {groups.map((group) => <section key={group.key} className="l-container--full-width t-bg-transparent axlTileCollection">
      <div className="l-grid l-grid--max-width">
        {shouldRenderTextField(group.heading?.jsonValue, editing) && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-left"><header>
            <div className="tileHeading"><Text tag="h2" field={group.heading?.jsonValue} editable={editing} /></div>
          </header></div></article>
        </div></div>}
        <div className="l-grid__row investment-portfolio__items">{group.items.map((item) => <InvestmentCard key={item.id} item={item} editing={editing} />)}</div>
      </div>
    </section>)}
    {!automatic?.complete && <p role="status" className="l-grid l-grid--max-width">{editing
      ? automatic?.error === 'unconfigured' ? 'Configure the verified native Investment Portfolio and Investment templates before loading this collection.'
        : 'The investment collection could not be loaded completely. Check its child items, required company names and Active/Exited values.'
      : 'The investment portfolio is temporarily unavailable.'}</p>}
    {editing && automatic?.complete && <p role="status" className="l-grid l-grid--max-width">Add or edit Investment children under this component’s datasource. Investment status chooses the section; company name sets alphabetical order.</p>}
  </div>;
};
