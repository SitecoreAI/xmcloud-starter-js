# Allianz Life rendering host

Sitecore Content SDK / Next.js rendering host for the authorized public English Allianz Life reproduction. Source content is split into editable component datasources and finite child collections. Original images, documents and Allianz Neo fonts are self-hosted in the fixture build.

## Run the disconnected checkpoint

Use Node 24 and npm 10 or newer. From this directory:

```sh
npm ci --ignore-scripts
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_ALLIANZ_CONTENT_MODE=fixture npm run build
npm run lint -- --max-warnings=0
npm run type-check
node --test src/components/allianz-form/form-validation.test.mjs src/components/content-sdk/dialog-focus.test.mjs
npm run next:start -- --port 3100
```

The build regenerates Sitecore component maps, local import maps, metadata and disconnected site metadata from a clean checkout. It does not need transferred Mac caches or Sitecore credentials. In environments with a read-only home directory, pass a writable workspace path to npm's `--cache` option.

Production fixture mode resolves the 357 canonical routes without calling Edge, authentication, original Allianz services, form endpoints or trackers. Form and account interfaces are local mocks. The CSP blocks form submission, and responses are `noindex, nofollow, noarchive`. Browser interaction and pixel fidelity require separate checks; a successful build or HTTP response audit does not establish those results.

The local server address is meaningful only in the server's own networking context. A cloud browser or the user's browser needs a supported preview mapping; do not assume either can reach the cloud executor's loopback address.

## Connected native mode

Use `.env.remote.example` as the configuration contract. Set `NEXT_PUBLIC_ALLIANZ_CONTENT_MODE=connected` only after the existing Sitecore project/environment, isolated native site, Edge context and editing host have been verified through the authorized account flow. Never invent identifiers or copy reusable Mac credentials into this workspace.

- Preserve project `thlt-mnp-demo` and its existing `dev` environment
- Bind the real scaffold Site, Home, Data, Presentation, Settings and site-definition IDs before editorial preparation
- Capture Home's original English version, revision, template and fields before any proposed update
- An Empty-site Home template change is a separately reviewed reversible operation; the import must not silently change or adopt it
- Keep editorial/media packages private and separate from the exact `Project.AllianzLife.Structure` deployment module
- Complete one real Pages edit/save/publish and connected rendering gate before scaling native imports
- Leave analytics disabled until the isolated demo identity, consent and supported native feature scope are verified

The requested homepage campaign is `utm_campaign=retirement_income`. Product-interest affinity has annuities and life-insurance audiences, with explicit campaign precedence and original content as the fallback. These require actual tenant configuration and availability checks. The native A/B CTA test belongs on the separate unpersonalized annuities route. Fixture tests or proposed content do not establish native assignment, affinity entitlement or an active experiment.

The repository branch is `allianz-life`. Publication is still gated on authorized GitHub access and the existing Vercel `mnp` project's reviewed mapping. No upstream PR is required.

See [deployment and acceptance plan](../../docs/allianz-life/deployment-plan.md) and [authoring contract](../../authoring/allianz-life/README.md) for the full import and acceptance boundaries.
