import { Image, Link, RichText, Text } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, safeLink, type AllianzProps } from 'lib/allianz-fields';

export const Default = ({ fields, params }: AllianzProps) => {
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyCardGrid" />;
  const columns = ({ '1': 12, '2': 6, '3': 4, '4': 3 } as Record<string, number>)[params.columns] ?? 6;
  const breakpoint = params.breakpoint === 'md' ? 'md' : 'sm';
  const region = ['pre-content', 'content', 'post-content', 'disclosure'].includes(params.region) ? params.region : 'content';
  return <div className="row" id={params.RenderingIdentifier}><div className={`col-md-12 content-body ${region}`}>
    {data.heading?.jsonValue?.value && <Text tag="h2" field={data.heading.jsonValue} />}
    <div className={`row mod-row ${params.noMarginBottom === '1' ? 'no-margin-bottom' : ''}`}>
      {(data.children?.results ?? []).map((card) => <div className={`col-${breakpoint}-${columns}`} key={card.id}><article className="mod">
        <div className={params.alignment === 'center' ? 'icon-with-text text-center' : undefined}>
          {card.image?.jsonValue?.value?.src && <Image field={card.image.jsonValue} className="allianz-legacy-card-image" />}
          {card.icon?.jsonValue?.value?.src && <div className="icon-container"><div className="icon-background primary-01-bg" /><Image field={card.icon.jsonValue} className="icon icon-story" /></div>}
          <Text tag={headingTag(card.headingLevel?.jsonValue?.value || params.headingLevel || 'h3')} field={card.heading?.jsonValue} />
          <RichText field={card.body?.jsonValue} />
          {card.link?.jsonValue?.value?.href && <p className="link"><Link field={safeLink(card.link.jsonValue)} /></p>}
        </div>
      </article></div>)}
    </div>
  </div></div>;
};
