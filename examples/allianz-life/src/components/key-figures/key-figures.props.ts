import type { Field } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from 'lib/component-props';

type TextField = { jsonValue?: Field<string> };
export interface KeyFigure {
  id: string;
  figure?: TextField;
  caption?: TextField;
  fieldCollection?: { name?: string; jsonValue?: unknown }[] | null;
}
export interface KeyFiguresDatasource {
  id?: string;
  children?: { total?: number; pageInfo?: { hasNext?: boolean; endCursor?: string | null }; results: KeyFigure[] };
}
export type KeyFiguresProps = ComponentProps & {
  fields?: { data?: { datasource?: KeyFiguresDatasource } };
};

/** Integrated queries have no automatic pagination; never present a partial set as complete. */
export function completeKeyFigureChildren(children: KeyFiguresDatasource['children']): children is NonNullable<KeyFiguresDatasource['children']> {
  if (!children || !Number.isSafeInteger(children.total) || (children.total ?? -1) < 0 ||
    children.pageInfo?.hasNext !== false || !Array.isArray(children.results) ||
    children.results.length !== children.total) return false;
  const ids = new Set<string>();
  for (const child of children.results) {
    if (!child || typeof child.id !== 'string' || !child.id.trim() || ids.has(child.id)) return false;
    ids.add(child.id);
  }
  return true;
}

/** Preserve native Field metadata and deliberate clears from the compact query. */
export function keyFigureFields(item: KeyFigure): KeyFigure {
  const result = { ...item };
  for (const field of item.fieldCollection ?? []) {
    const name = field?.name?.toLowerCase();
    if ((name === 'figure' || name === 'caption') && Object.hasOwn(field, 'jsonValue') && !Object.hasOwn(result, name)) {
      result[name] = { jsonValue: field.jsonValue as Field<string> };
    }
  }
  return result;
}
