interface TextField { value?: unknown }
export interface AllianzMetadataFields {
  pageTitle?: TextField;
  metaDescription?: TextField;
  Title?: TextField;
  metadataDescription?: TextField;
  ogTitle?: TextField;
  ogDescription?: TextField;
}
const text = (field?: TextField) => typeof field?.value === 'string' ? field.value.trim() : '';

/** Project page fields are genuine native schema fields; stock names are fallbacks. */
export function allianzMetadata(fields?: AllianzMetadataFields) {
  const title = text(fields?.pageTitle) || text(fields?.Title) || 'Page';
  const description = text(fields?.metaDescription) || text(fields?.metadataDescription) || text(fields?.ogDescription);
  return {
    title,
    description,
    openGraphTitle: text(fields?.ogTitle) || title,
    openGraphDescription: text(fields?.ogDescription) || description,
  };
}
