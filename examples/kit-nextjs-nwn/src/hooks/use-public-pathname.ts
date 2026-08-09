'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Returns the browser-visible URL after hydration. Starting from `/` keeps the
 * server and first client render stable when Next.js has internally rewritten
 * a localized Sitecore route.
 */
export const usePublicPathname = () => {
  const routedPathname = usePathname();
  const [publicPathname, setPublicPathname] = useState('/');

  useEffect(() => {
    const nextPublicPathname = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    setPublicPathname((currentPathname) =>
      currentPathname === nextPublicPathname
        ? currentPathname
        : nextPublicPathname,
    );
  }, [routedPathname]);

  return publicPathname;
};
