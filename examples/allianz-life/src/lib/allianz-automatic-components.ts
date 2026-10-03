import 'server-only';
import type { ComponentMap, NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';
import { enrichNewsroomComponentMap, type NewsroomAutomaticServerOptions } from './newsroom-automatic-server';
import { enrichPeopleComponentMap } from './people-automatic-server';
import { enrichDocumentComponentMap } from '../components/prospectus-product-directory/document-automatic-server.props';

/** Compose native component hooks once per request, sharing its scoped SDK reader. */
export function enrichAllianzComponentMap(
  components: ComponentMap<NextjsContentSdkComponent>,
  options: NewsroomAutomaticServerOptions,
): ComponentMap<NextjsContentSdkComponent> {
  return enrichPeopleComponentMap(
    enrichDocumentComponentMap(enrichNewsroomComponentMap(components, options), options),
    options,
  );
}
