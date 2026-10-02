# Breadcrumb trail

This fixed component reads the current page and its native ancestors. Authors
maintain each page's existing navigation title, once. There is no datasource,
independent link list, layout choice, or duplicated ancestry content.

Ancestor titles retain their native SDK field objects and editing metadata.
The current title is plain text with `aria-current="page"`. Ancestor links come
from native `url.path`. Empty titles remain editable in Pages; incomplete or
unsafe normal-mode trails show an explicit unavailable state rather than
manufactured labels or paths.

Before native registration, verify that the integrated query selects the exact
inherited SXA NavigationTitle field on both scaffold and project page types.
Source-specific labels differ from article headlines on 44 of 81 releases.
Bind those source labels to the existing field; never infer labels from slugs.

Registration uses one optional-datasource Json Rendering, a Default Headless
Variant and the corrected standard parameter lineage. No datasource template,
location, default, automatic creation property, or `withDatasourceCheck` is
used. Keep the existing datasource-driven Annuities breadcrumb unchanged.

Native Preview and browser acceptance must establish the full ancestor chain,
field identity, no datasource creation, relevant editing, internal navigation,
and source geometry at its actual responsive boundaries.
