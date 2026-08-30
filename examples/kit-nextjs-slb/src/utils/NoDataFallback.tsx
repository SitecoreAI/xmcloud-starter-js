'use client';

import { kebabCase, capitalCase } from 'change-case';
import { useSitecore } from '@sitecore-content-sdk/nextjs';

import type { JSX } from 'react';

interface ComponentName {
  componentName: string;
}

const NoDataFallback = (props: ComponentName): JSX.Element => {
  const { componentName } = props;
  const { page } = useSitecore();

  // Datasource guidance is authoring chrome, never public content.
  if (!page?.mode.isEditing) return <></>;

  return (
    <div className={`component ${kebabCase(componentName)}`}>
      <div className="component-content">
        <span className="is-empty-hint">
          {capitalCase(componentName)} requires a datasource item assigned.
          Please assign a datasource item to edit the content.
        </span>
      </div>
    </div>
  );
};

export { NoDataFallback };
