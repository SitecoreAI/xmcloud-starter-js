import Image from 'next/image';
import Link from 'next/link';
import type {
  SlbFallbackComponent,
  SlbFallbackCta,
  SlbFallbackImage,
  SlbFallbackPageModel,
  SlbFallbackRelatedPage,
} from '@/lib/slb-fallback-content';
import { getSlbDamAssetUrl } from '@/lib/slb-dam-assets';
import styles from './SlbFallbackPage.module.css';

interface SlbFallbackPageProps {
  page: SlbFallbackPageModel;
  editing?: boolean;
}

const labels = {
  en: {
    digital: 'Digital',
    energy: 'Energy',
    explore: 'Explore',
    howWeWork: 'How we work',
    related: 'Continue exploring',
    science: 'Science',
    switchLanguage: 'Leer en español',
    technology: 'Technology',
    topics: 'Topics',
  },
  'es-MX': {
    digital: 'Tecnología digital',
    energy: 'Energía',
    explore: 'Explorar',
    howWeWork: 'Cómo trabajamos',
    related: 'Continúe explorando',
    science: 'Ciencia',
    switchLanguage: 'Read in English',
    technology: 'Tecnología',
    topics: 'Temas',
  },
} as const;

type LocalizedLabels = (typeof labels)[keyof typeof labels];

// Cards only become links when the content-to-destination relationship is
// explicitly approved here. If either title changes, the card safely renders
// as editorial content instead of silently pointing to an unrelated page.
const relatedPageTitleByCard: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  H01: {
    'Innovate in oil and gas': 'Subsurface and well delivery',
    'Deliver digital and AI at scale': 'Digital operations',
    'Decarbonize industry': 'Industrial decarbonization',
    'Scale new energy systems': 'New energy systems',
    'Innovar en petróleo y gas': 'Subsuelo y construcción de pozos',
    'Llevar la tecnología digital y la IA a escala': 'Operaciones digitales',
    'Descarbonizar la industria': 'Descarbonización industrial',
    'Escalar nuevos sistemas de energía': 'Nuevos sistemas de energía',
  },
  S01: {
    'Improve performance': 'Products and services',
    'Connect decisions': 'Digital operations',
    'Reduce emissions': 'Industrial decarbonization',
    'Develop new systems': 'New energy systems',
    'Mejorar el desempeño': 'Productos y servicios',
    'Conectar decisiones': 'Operaciones digitales',
    'Reducir emisiones': 'Descarbonización industrial',
    'Desarrollar nuevos sistemas': 'Nuevos sistemas de energía',
  },
  S04: {
    'Carbon storage': 'Carbon capture, utilization, and sequestration',
    'Almacenamiento de carbono':
      'Captura, utilización y almacenamiento de carbono',
  },
  P01: {
    'Understand the subsurface': 'Subsurface and well delivery',
    'Connect data and AI': 'Data and AI',
    'Comprender el subsuelo': 'Subsuelo y construcción de pozos',
    'Conectar datos e IA': 'Datos e IA',
  },
  U01: {
    'Climate action': 'Climate action',
    People: 'People and communities',
    Nature: 'Nature and responsible operations',
    'Acción climática': 'Acción climática',
    Personas: 'Personas y comunidades',
    Naturaleza: 'Naturaleza y operaciones responsables',
  },
  N02: {
    'AI in energy starts with trusted context':
      'AI in energy starts with trusted context',
    'Designing decarbonization for execution':
      'Designing decarbonization for execution',
    'La IA en energía comienza con un contexto confiable':
      'La IA en energía comienza con un contexto confiable',
    'Diseñar la descarbonización para la ejecución':
      'Diseñar la descarbonización para la ejecución',
    'What it takes to scale subsurface innovation':
      'Subsurface and well delivery',
    'Lo que se necesita para escalar la innovación del subsuelo':
      'Subsuelo y construcción de pozos',
  },
  N05: {
    'Company news': 'News and insights',
    'Technology updates': 'Insights',
    'Project stories': 'News and insights',
    'Noticias de la compañía': 'Noticias y análisis',
    'Actualizaciones de tecnología': 'Análisis',
    'Historias de proyectos': 'Noticias y análisis',
  },
  A01: {
    People: 'People and culture',
    Technology: 'Technology and innovation',
    Personas: 'Personas y cultura',
    Tecnología: 'Tecnología e innovación',
  },
  C01: {
    'Discuss a technical challenge': 'Solutions',
    'Explore products and services': 'Products and services',
    'Company and media inquiries': 'Newsroom',
    'Analizar un desafío técnico': 'Soluciones',
    'Explorar productos y servicios': 'Productos y servicios',
    'Consultas corporativas y de medios': 'Sala de prensa',
  },
};

function relatedPageForCard(
  pageId: string,
  cardTitle: string,
  relatedPages: SlbFallbackRelatedPage[],
) {
  const approvedTitle = relatedPageTitleByCard[pageId]?.[cardTitle];
  if (!approvedTitle) return undefined;

  return relatedPages.find(
    (relatedPage) => relatedPage.title === approvedTitle,
  );
}

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
      src={getSlbDamAssetUrl(image.filename)}
      unoptimized
    />
  );
}

function CardGrid({
  component,
  images,
  pageId,
  relatedPages,
}: {
  component: SlbFallbackComponent;
  images: SlbFallbackImage[];
  pageId: string;
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
            const relatedPage = relatedPageForCard(
              pageId,
              item.title,
              relatedPages,
            );
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
                  <div className={styles.cardStatic}>{cardContent}</div>
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
  pageId,
  relatedPages,
}: {
  component: SlbFallbackComponent;
  images: SlbFallbackImage[];
  pageId: string;
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
              const relatedPage = relatedPageForCard(
                pageId,
                item.title,
                relatedPages,
              );
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

function ProcessSteps({
  component,
  kicker,
}: {
  component: SlbFallbackComponent;
  kicker: string;
}) {
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
          <p className={styles.kicker}>{kicker}</p>
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
        <ul className={styles.filterList}>
          {filters.map((filter) => (
            <li className={styles.filter} key={filter}>
              {filter}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CompactFeature({
  component,
  kicker,
}: {
  component: SlbFallbackComponent;
  kicker: string;
}) {
  return (
    <section
      className={`${styles.section} ${styles.deepFeature}`}
      id={component.anchorId}
    >
      <div className={styles.featureInner}>
        <div>
          <p className={styles.kickerAqua}>{kicker}</p>
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
  localizedLabels,
  pageId,
  relatedPages,
}: {
  component: SlbFallbackComponent;
  image?: SlbFallbackImage;
  index: number;
  images: SlbFallbackImage[];
  localizedLabels: LocalizedLabels;
  pageId: string;
  relatedPages: SlbFallbackRelatedPage[];
}) {
  switch (component.type) {
    case 'cardGrid':
      return (
        <CardGrid
          component={component}
          images={images}
          pageId={pageId}
          relatedPages={relatedPages}
        />
      );
    case 'contentRail':
      return (
        <ContentRail
          component={component}
          images={images}
          pageId={pageId}
          relatedPages={relatedPages}
        />
      );
    case 'filterBar':
      return <FilterBar component={component} />;
    case 'processSteps':
      return (
        <ProcessSteps
          component={component}
          kicker={localizedLabels.howWeWork}
        />
      );
    case 'productFeature':
    case 'resourceLinks':
      return (
        <CompactFeature
          component={component}
          kicker={localizedLabels.technology}
        />
      );
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
          {(fields.hero.searchLabel || fields.hero.filterLabels?.length) && (
            <div className={styles.heroDiscovery}>
              {fields.hero.searchLabel && (
                <p className={styles.heroSearchLabel}>
                  {fields.hero.searchLabel}
                </p>
              )}
              {!!fields.hero.filterLabels?.length && (
                <ul
                  aria-label={localizedLabels.topics}
                  className={styles.heroFilters}
                >
                  {fields.hero.filterLabels.map((filter) => (
                    <li key={filter}>{filter}</li>
                  ))}
                </ul>
              )}
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
        <span>{localizedLabels.science}</span>
        <span>{localizedLabels.digital}</span>
        <span>{localizedLabels.energy}</span>
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
            localizedLabels={localizedLabels}
            pageId={page.id}
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
