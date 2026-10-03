import { Image, RichText, Text } from '@sitecore-content-sdk/nextjs';
import type { DirectoryPerson } from 'lib/people-automatic-data';
import { shouldRenderImageField, shouldRenderTextField } from 'lib/allianz-field-state';

/** Biography-owned fields are read-only here; edit the actual biography, not a duplicate card. */
export const PeopleCards = ({ items, editing }: { items: DirectoryPerson[]; editing: boolean }) => <div className="l-grid__row"><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">
  {items.map((person) => <article key={person.pageId} className="m-card">
    {shouldRenderImageField(person.portrait?.jsonValue, false) && <div className="m-card__image"><picture className="c-image">
      <Image field={person.portrait?.jsonValue} editable={false} alt={person.portrait?.jsonValue?.value?.alt ?? ''}
        className="c-image__img c-teaser__image-img" style={{ maxWidth: '100%', height: 'auto' }} />
    </picture></div>}
    <div className="m-card__header">
      <h4><a href={person.href} className={`people-directory__link${editing ? '' : ' people-directory__link--stretched'}`}>
        {shouldRenderTextField(person.name?.jsonValue, false) ? <Text field={person.name?.jsonValue} editable={false} /> : <span>View biography</span>}
      </a></h4>
      {shouldRenderTextField(person.role?.jsonValue, false) && <RichText tag="div" field={person.role?.jsonValue} editable={false} className="people-directory__role" />}
    </div>
    {shouldRenderTextField(person.directorySummary?.jsonValue, false) && <RichText tag="div" field={person.directorySummary?.jsonValue} editable={false} className="m-card__body" />}
  </article>)}
</div></div></div>;
