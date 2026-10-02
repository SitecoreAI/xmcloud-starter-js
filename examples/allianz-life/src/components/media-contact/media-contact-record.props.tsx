'use client';

import { Link, Text } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { mediaContactFields, type MediaContactProps } from './media-contact.props';
import './MediaContact.css';

/** Internal record renderer: its four fields are edited on the selected contact. */
export const MediaContact = ({ contact, isEditing }: MediaContactProps) => {
  const source = mediaContactFields(contact);
  const telephone = shouldRenderLinkField(source.telephone?.jsonValue, isEditing);
  const email = shouldRenderLinkField(source.email?.jsonValue, isEditing);
  return <article className="m-axlTile match-height -is--stacked t-bg-primary-white allianz-media-contact">
    <div className="tileContent u-text-center"><div className="tileSubGrid__content">
      <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
      <div className="tileBody u-font-size-md">
        {shouldRenderTextField(source.name?.jsonValue, isEditing) && <Text field={source.name?.jsonValue} tag="div"
          className="tileBody u-font-size-xl" editable={isEditing} />}
        {shouldRenderTextField(source.role?.jsonValue, isEditing) && <Text field={source.role?.jsonValue} editable={isEditing} />}
        {(telephone || email) && <p>
          {telephone && <Link field={allianzLinkField(source.telephone?.jsonValue, isEditing)} editable={isEditing} />}
          {telephone && email && <br />}
          {email && <Link field={allianzLinkField(source.email?.jsonValue, isEditing)} editable={isEditing} />}
        </p>}
      </div>
    </div></div>
  </article>;
};
