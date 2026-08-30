import Image from 'next/image';
import Link from 'next/link';
import type {
  SlbFallbackComponent,
  SlbFallbackCta,
  SlbFallbackImage,
  SlbFallbackPageModel,
  SlbFallbackRelatedPage,
} from '@/lib/slb-fallback-content';
import styles from './SlbFallbackPage.module.css';

interface SlbFallbackPageProps {
  page: SlbFallbackPageModel;
  editing?: boolean;
}

const labels = {
  en: {
    explore: 'Explore',
    related: 'Continue exploring',
    switchLanguage: 'Leer en español',
  },
  'es-MX': {
    explore: 'Explorar',
    related: 'Continúa explorando',
    switchLanguage: 'Read in English',
  },
} as const;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M5 12h13M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SlbLink({
  cta,
  variant = 'primary',
}: {
  cta: SlbFallbackCta;
  variant?: 'primary' | 'secondary' | 'text';
}) {
  const className = `${styles.cta} ${styles[variant]}`;
  const content = (
    <>
      <span>{cta.label}</span>
      <ArrowIcon />
    </>
  );

  if (cta.target.startsWith('http')) {
    return (
      <a className={className} href={cta.target}>
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={cta.target}>
      {content}
    </Link>
  );
}

function EditorialImage({
  image,
  priority = false,
}: {
  image: SlbFallbackImage;
  priority?: boolean;
}) {
  return (
    <Image
      alt={image.alt}
      className={styles.image}
      fill
      priority={priority}
      sizes="(max-width: 768px) 100vw, 50vw"
      src={`/images/slb/${image.filename}`}
    />
  );
}

function CardGrid({
  component,
  images,
  relatedPages,
}: {
  component: SlbFallbackComponent;
  images: SlbFallbackImage[];
  relatedPages: SlbFallbackRelatedPage[];
}) {
  if (!component.items?.length) return null;

  return (
    <section
      className={`${styles.section} ${styles.lightSection}`}
      id={component.anchorId}
    >
      <div className={styles.sectionInner}>
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>SLB</p>
          <h2>{component.heading}</h2>
          {component.body && <p>{component.body}</p>}
        </div>
        <div className={styles.cardGrid}>
          {component.items.map((item, index) => {
            const image = images.length
              ? images[index % images.length]
              : undefined;
            const relatedPage = relatedPages.length
              ? relatedPages[index % relatedPages.length]
              : undefined;
            const cardContent = (
              <>
                {image && (
                  <div className={styles.cardMedia}>
                    <EditorialImage image={image} />
                  </div>
                )}
                <div className={styles.cardCopy}>
                  <span className={styles.cardNumber}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  {relatedPage && <ArrowIcon />}
                </div>
              </>
            );

            return (
              <article
                className={styles.card}
                key={`${component.id}-${item.title}`}
              >
                {relatedPage ? (
                  <Link className={styles.cardLink} href={relatedPage.route}>
                    {cardContent}
                  </Link>
                ) : (
                  cardContent
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ContentSection({
  component,
  image,
  reverse,
}: {
  component: SlbFallbackComponent;
  image?: SlbFallbackImage;
  reverse: boolean;
}) {
  return (
    <section
      className={`${styles.section} ${reverse ? styles.frostSection : styles.whiteSection}`}
      id={component.anchorId}
    >
      <div className={`${styles.split} ${reverse ? styles.reverse : ''}`}>
        <div className={styles.splitCopy}>
          <p className={styles.kicker}>SLB</p>
          <h2>{component.heading}</h2>
          {component.body && <p>{component.body}</p>}
          {component.cta && <SlbLink cta={component.cta} variant="text" />}
        </div>
        {image && (
          <div className={styles.splitMedia}>
            <EditorialImage image={image} />
          </div>
        )}
      </div>
    </section>
  );
}

function ContentRail({
  component,
  images,
  relatedPages,
}: {
  component: SlbFallbackComponent;
  images: SlbFallbackImage[];
  relatedPages: SlbFallbackRelatedPage[];
}) {
  if (!component.items?.length && !component.body && !component.cta)
    return null;

  return (
    <section
      className={`${styles.section} ${styles.darkSection}`}
      id={component.anchorId}
    >
      <div className={styles.sectionInner}>
        <div className={styles.sectionIntro}>
          <p className={styles.kickerAqua}>SLB</p>
          <h2>{component.heading}</h2>
          {component.body && <p>{component.body}</p>}
          {component.cta && <SlbLink cta={component.cta} variant="secondary" />}
        </div>
        {component.items && (
          <div className={styles.rail}>
            {component.items.map((item, index) => {
              const image = images.length
                ? images[index % images.length]
                : undefined;
              const relatedPage = relatedPages.length
                ? relatedPages[index % relatedPages.length]
                : undefined;
              const content = (
                <>
                  {image && (
                    <div className={styles.railMedia}>
                      <EditorialImage image={image} />
                    </div>
                  )}
                  <span className={styles.railRule} />
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </>
              );

              return (
                <article
                  className={styles.railCard}
                  key={`${component.id}-${item.title}`}
                >
                  {relatedPage ? (
                    <Link className={styles.railLink} href={relatedPage.route}>
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ProcessSteps({ component }: { component: SlbFallbackComponent }) {
  const steps = component.body
    ?.split(/(?<=[.!?])\s+/)
    .map((step) => step.trim())
    .filter(Boolean);

  return (
    <section
      className={`${styles.section} ${styles.aquaSection}`}
      id={component.anchorId}
    >
      <div className={styles.sectionInner}>
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>How we work</p>
          <h2>{component.heading}</h2>
        </div>
        <div className={styles.steps}>
          {(steps?.length ? steps : [component.body])
            .filter(Boolean)
            .map((step, index) => (
              <div className={styles.step} key={`${component.id}-${index}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

function FilterBar({ component }: { component: SlbFallbackComponent }) {
  const filters =
    component.body
      ?.split('|')
      .map((filter) => filter.trim())
      .filter(Boolean) || [];
  if (!filters.length) return null;

  return (
    <section
      className={styles.filterSection}
      aria-label={component.heading}
      id={component.anchorId}
    >
      <div className={styles.filterInner}>
        {filters.map((filter, index) => (
          <span
            className={index === 0 ? styles.activeFilter : styles.filter}
            key={filter}
          >
            {filter}
          </span>
        ))}
      </div>
    </section>
  );
}

function CompactFeature({ component }: { component: SlbFallbackComponent }) {
  return (
    <section
      className={`${styles.section} ${styles.deepFeature}`}
      id={component.anchorId}
    >
      <div className={styles.featureInner}>
        <div>
          <p className={styles.kickerAqua}>Technology</p>
          <h2>{component.heading}</h2>
        </div>
        <div>
          {component.body && <p>{component.body}</p>}
          {component.cta && <SlbLink cta={component.cta} variant="secondary" />}
        </div>
      </div>
    </section>
  );
}

function ComponentSection({
  component,
  image,
  index,
  images,
  relatedPages,
}: {
  component: SlbFallbackComponent;
  image?: SlbFallbackImage;
  index: number;
  images: SlbFallbackImage[];
  relatedPages: SlbFallbackRelatedPage[];
}) {
  switch (component.type) {
    case 'cardGrid':
      return (
        <CardGrid
          component={component}
          images={images}
          relatedPages={relatedPages}
        />
      );
    case 'contentRail':
      return (
        <ContentRail
          component={component}
          images={images}
          relatedPages={relatedPages}
        />
      );
    case 'filterBar':
      return <FilterBar component={component} />;
    case 'processSteps':
      return <ProcessSteps component={component} />;
    case 'productFeature':
    case 'resourceLinks':
      return <CompactFeature component={component} />;
    case 'contentSection':
    default:
      return (
        <ContentSection
          component={component}
          image={image}
          reverse={index % 2 === 1}
        />
      );
  }
}

export default function SlbFallbackPage({
  page,
  editing = false,
}: SlbFallbackPageProps) {
  const { fields } = page;
  const localizedLabels = labels[page.locale];
  let imageIndex = 0;

  return (
    <article
      className={`${styles.page} ${editing ? styles.editingPreview : ''}`}
      data-slb-fallback-page={page.id}
      data-slb-fallback-editing={editing || undefined}
    >
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroMeta}>
            <span>{fields.hero.eyebrow || fields.navigationTitle}</span>
            <Link
              href={page.alternateRoute}
              hrefLang={page.locale === 'en' ? 'es-MX' : 'en'}
            >
              {localizedLabels.switchLanguage}
            </Link>
          </div>
          <h1>{fields.hero.heading}</h1>
          <p>{fields.hero.summary}</p>
          <div className={styles.heroActions}>
            {fields.hero.primaryCta && <SlbLink cta={fields.hero.primaryCta} />}
            {fields.hero.secondaryCta && (
              <SlbLink cta={fields.hero.secondaryCta} variant="secondary" />
            )}
          </div>
          {fields.hero.filterLabels && (
            <div className={styles.heroFilters}>
              {fields.hero.filterLabels.map((filter) => (
                <span key={filter}>{filter}</span>
              ))}
            </div>
          )}
        </div>
        {fields.hero.image && (
          <div className={styles.heroMedia}>
            <EditorialImage image={fields.hero.image} priority />
            <span className={styles.heroAccent} />
          </div>
        )}
      </section>

      <div className={styles.signalBar} aria-hidden="true">
        <span>Science</span>
        <span>Digital</span>
        <span>Energy</span>
      </div>

      {fields.components.map((component, index) => {
        const image =
          component.type === 'contentSection'
            ? fields.supportingImages[
                imageIndex++ % Math.max(fields.supportingImages.length, 1)
              ]
            : undefined;
        return (
          <ComponentSection
            component={component}
            image={image}
            images={fields.supportingImages}
            index={index}
            key={component.id}
            relatedPages={page.relatedPages}
          />
        );
      })}

      {page.relatedPages.length > 0 && (
        <section className={`${styles.section} ${styles.relatedSection}`}>
          <div className={styles.sectionInner}>
            <p className={styles.kicker}>{localizedLabels.explore}</p>
            <h2>{localizedLabels.related}</h2>
            <div className={styles.relatedGrid}>
              {page.relatedPages.slice(0, 4).map((relatedPage) => (
                <Link
                  className={styles.relatedLink}
                  href={relatedPage.route}
                  key={relatedPage.route}
                >
                  <span>{relatedPage.title}</span>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {fields.finalCta && (
        <section className={styles.finalCta}>
          <div>
            <p className={styles.kickerAqua}>SLB</p>
            <h2>{fields.finalCta.heading}</h2>
          </div>
          <SlbLink cta={fields.finalCta} variant="secondary" />
        </section>
      )}
    </article>
  );
}
