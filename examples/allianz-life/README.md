# Allianz Life rendering host

Sitecore Content SDK / Next.js rendering host for the authorized public English Allianz Life reproduction. Source content is split into editable component datasources and finite child collections. Original images, documents and Allianz Neo fonts are self-hosted in the fixture build.

## Build and run with Sitecore

Use Node 24 and npm 10 or newer. Configure the existing Sitecore environment through its approved hosting setup, using `.env.remote.example` for variable names. The app uses the standard Content SDK configuration and native CMS content by default. No custom content-mode setting is required.

```sh
npm ci --ignore-scripts
NEXT_TELEMETRY_DISABLED=1 npm run build
npm run lint -- --max-warnings=0
npm run type-check
npm run next:start -- --port 3100
```

A connected build generates the native site list and component maps. It requires a configured Sitecore server context or the SDK's supported local API credentials and access to that endpoint. Missing CMS configuration or failed CMS reads surface errors; they never substitute copied sample pages. Use the existing Preview context for authored content or Live context for published content. Vercel's Preview deployment label does not choose the Sitecore context. Keep server credentials out of public variables, logs and source control.

## Explicit local development/test samples

Sample content is available only when explicitly selected in development or test:

```sh
NEXT_PUBLIC_ALLIANZ_CONTENT_MODE=fixture npm run dev
node --test src/lib/allianz-content-mode.test.mjs src/lib/allianz-page-loader.test.mjs
```

An unset, unknown, or stale production content-mode value still uses Sitecore. Samples verify isolated rendering and interactions; they do not prove CMS integration or native authoring. Form and account interfaces remain local mocks, analytics stays disabled, and responses use `noindex, nofollow, noarchive`.

The local server address is meaningful only in the server's own networking context. A cloud browser or the user's browser needs a supported preview mapping; do not assume either can reach the cloud executor's loopback address.

## Native authoring and acceptance

- Preserve project `thlt-allianz-demo` and its existing `dev` environment
- Preserve native page, datasource and presentation identities and current authored content
- Verify Pages editing and connected rendering through the existing authoring environment
- Leave analytics disabled until the isolated demo identity, consent and supported native feature scope are verified

The requested homepage campaign is `utm_campaign=retirement_income`. Product-interest affinity has annuities and life-insurance audiences, with explicit campaign precedence and original content as the fallback. These require actual tenant configuration and availability checks. The native A/B CTA test belongs on the separate unpersonalized annuities route. Fixture tests or proposed content do not establish native assignment, affinity entitlement or an active experiment.

The repository branch is `allianz-life`. Publish migration changes through the authorized GitHub repository and existing Allianz Life editing host in `thlt-allianz-demo/dev`. A Vercel test uses the same app with its independently verified existing Sitecore configuration. No upstream PR is required.

See [deployment and acceptance plan](../../docs/allianz-life/deployment-plan.md) and [authoring contract](../../authoring/allianz-life/README.md) for the full import and acceptance boundaries.
