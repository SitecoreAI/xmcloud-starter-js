# Allianz Life dependency security checkpoint

Checked: 2026-09-30 UTC. Scope: `examples/allianz-life` in this working tree.

## Result

- Before remediation, `npm audit --json` reported **10 vulnerable dependency groups: 1 critical, 7 high and 2 moderate**. Those groups included 38 distinct advisory URLs; npm counts package groups rather than individual advisories.
- After remediation and a clean install, **full and production-only audits each report 0 vulnerabilities** (critical/high/moderate/low/info all zero).
- Next.js and its ESLint config resolve to **16.3.8**. The audit initially identified 16.3.6 as the floor for the latest recorded critical Next advisory. The [official 16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8), published September 30, also contains same-day image-optimization SSRF, cache and Draft Mode security fixes, so the manifest minimum is 16.3.8.
- Only four manifest settings changed: Next minimum, matching ESLint config, PostCSS override and the existing brace-expansion 5.x override. No new direct dependencies, force upgrade or new major Next/Sitecore/React version was introduced. Required transitive dependencies and platform-specific native packages were regenerated in the lockfile.

## Resolved changes and dependency scope

| Dependency | Before severity | Scope | Before | After | Remediation |
|---|---|---|---|---|---|
| next | Critical | Direct runtime | 16.2.9 | 16.3.8 | Next runtime and platform-specific SWC packages; matching eslint-config-next 16.2.0 → 16.3.8 |
| sharp | High | Runtime via Next | 0.34.5 | 0.35.5 | Next now supports ^0.35.4; matching native binary/libvips packages were updated |
| postcss | High | Next runtime dependency and CSS build tooling | 8.5.15 | 8.5.28 | Override floor raised to ^8.5.23, keeping major 8; removes propagated @tailwindcss/postcss finding |
| brace-expansion | High | Mixed runtime/tooling and development | 1.1.15 / 5.0.6 | 1.1.21 / 5.0.12 | 1.x updated within minimatch range; existing 5.x override raised to 5.0.12 |
| fast-uri | High | Sitecore SDK → React/FaaS/BYOC → @rjsf/utils | 3.1.3 | 3.1.8 | Compatible 3.x patch inside parent ^3.1.2 range |
| nanoid | High | PostCSS dependency | 3.3.15 | 3.3.19 | Compatible 3.x patch |
| js-yaml | High | Development via @eslint/eslintrc | 4.2.0 | 4.3.2 | Compatible 4.x update |
| browserslist | High | Development via Babel/ESLint | 4.28.4 | 4.29.3 | Compatible 4.x update; supporting browser data refreshed |
| baseline-browser-mapping | Moderate | Next and browser tooling | 2.10.40 | 2.11.26 | Compatible 2.x update |
| @tailwindcss/postcss | Moderate | Direct development; propagated PostCSS issue | 4.3.1 | 4.3.1 | Parent unchanged; resolved PostCSS patched |

Sitecore Content SDK remains 2.2.0, React/React DOM remain 19.2.7, and TypeScript remains 5.8.3. Sitecore SDK's declared Next peer range (`^16.2.0`) accepts 16.3.8. Node 24 satisfies the patched packages' engine requirements. The sharp 0.35.x change is required by upstream fixes and supported by Next 16.3.8's declared optional dependency range; it is not an arbitrary cross-range override.

## Verification

Run on Node 24.19.0 and npm 11.9.0:

| Check | Result |
|---|---|
| `npm ci --ignore-scripts` using a writable workspace cache | Passed, 496 installed packages |
| `NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_ALLIANZ_CONTENT_MODE=fixture NEXTJS_DIST_DIR=.next-security-checkpoint npm run build` | Passed all three build stages: component-map generation, local Sitecore tools build, Next production build |
| `npm run lint -- --max-warnings=0` | Passed, zero warnings |
| `npm run type-check` | Passed before and after restoring temporary generated Next type-path changes |
| `node --test src/components/allianz-form/form-validation.test.mjs src/components/content-sdk/dialog-focus.test.mjs` | Passed both files: 28 form/search/calculator/safe-media assertions and 10 modal keyboard-policy assertions |
| Full `npm audit --json` | Passed, zero vulnerabilities |
| `npm audit --omit=dev --json` | Passed, zero vulnerabilities |
| Local sharp native smoke test | Passed PNG creation, WebP conversion and decode; sharp 0.35.5, libvips 8.18.7, libheif 1.23.5 |
| Manifest/lock root dependency agreement | Passed |

The isolated build's temporary changes to `tsconfig.json` and `next-env.d.ts` were restored byte-for-byte. No environment-specific build paths were left in source. Standard generated build/cache artifacts are excluded from publication. No browser, connected tenant, authenticated request, or full route/interaction audit was performed by this dependency checkpoint. Build success does not establish all 357 canonical routes or pixel fidelity.

## Fixture and connected deployment boundaries

The package fixes apply equally to fixture and connected builds. Fixture mode renders local content, uses mock forms/account interfaces, skips the connected Sitecore proxy pipeline and does not enable analytics. That reduces application-level external-service exposure, but it does not remove the Next server, image-optimization or editing API surface. CSP and noindex headers do not establish server-side authorization.

The pre-update critical advisories have different applicability:

- [Node ImageResponse RCE](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) requires attacker-controlled values in SVG content/attributes/styles in Node `next/og`. No application `next/og` or `ImageResponse` usage was found in source.
- [Windows-hosted server RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) targets Windows deployment; this build was verified on Linux.
- [AVIF image-optimization RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) and [sharp/libheif vulnerabilities](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) concern processing untrusted images. The native dependency is now patched; current fixture images are self-hosted.
- [Single-locale Turbopack proxy bypass](https://github.com/vercel/next.js/security/advisories/GHSA-6gpp-xcg3-4w24) is more consequential when connected preview, redirects and personalization are active. The patched Next release is required for either mode rather than relying on fixture behavior as mitigation.

Before connected deployment, separately verify real tenant bindings, editing-host authentication, consent/analytics gating and the approved deployment mapping. The current configuration contains broad image remote patterns (`edge*.**` and `xmc-*.**`). Narrow these to verified tenant media hosts when that configuration is prepared; avoid introducing guessed domains. The [same-day SSRF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) explains why allow-listed hosts still require trust review. The official 16.3.8 release includes its patch.

**Remaining npm advisories:** none in the audited lockfile as of this checkpoint. This is a point-in-time dependency check, not proof that every application/security issue is absent. Re-run both audits and the acceptance checks for the exact commit used to deploy. No remote repository, Sitecore or Vercel state was changed here; existing published builds gain these fixes only after an authorized rebuild/deployment using these manifests.

## Baseline advisory references

The list below records the exact advisories from the before-remediation audit. Duplicate version-range entries within a package are collapsed by URL.

### baseline-browser-mapping

- [baseline-browser-mapping process termination on invalid input causes denial of service](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) (moderate)

### brace-expansion

- [brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) (high)
- [brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash](https://github.com/advisories/GHSA-mh99-v99m-4gvg) (high)
- [brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation](https://github.com/advisories/GHSA-rgw5-rvv9-x895) (high)
- [brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) (moderate)
- [brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion](https://github.com/advisories/GHSA-qhr7-859c-m2p7) (high)
- [brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) (high)

### browserslist

- [Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) (high)
- [Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats)](https://github.com/advisories/GHSA-73wf-gq98-2v4g) (high)

### fast-uri

- [fast-uri vulnerable to host confusion via literal backslash authority delimiter](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) (high)
- [fast-uri vulnerable to host confusion via backslash authority introducer](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) (high)
- [fast-uri vulnerable to host confusion via skipped IDN canonicalization on scheme-relative references](https://github.com/advisories/GHSA-5jgf-p345-68v8) (high)
- [fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization](https://github.com/advisories/GHSA-f65p-4m7j-42xc) (high)
- [fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) (high)
- [fast-uri vulnerable to host confusion via percent-encoded scheme normalization](https://github.com/advisories/GHSA-jqff-g426-hqxp) (high)
- [fast-uri vulnerable to authority injection via an unvalidated port in serialize](https://github.com/advisories/GHSA-qw65-cvwx-89v3) (high)
- [fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) (moderate)

### js-yaml

- [js-yaml: YAML merge-key chains can force quadratic CPU consumption](https://github.com/advisories/GHSA-52cp-r559-cp3m) (high)
- [JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) (high)
- [js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources](https://github.com/advisories/GHSA-2883-xcg3-v3hh) (high)

### nanoid

- [nanoid: non-secure generators can loop indefinitely with negative size](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) (high)
- [nanoid: custom generators can loop indefinitely when size is zero](https://github.com/advisories/GHSA-2v37-7h3g-55p8) (high)

### next

- [Next.js: Middleware / Proxy bypass in App Router applications using Turbopack and single locale](https://github.com/advisories/GHSA-6gpp-xcg3-4w24) (high)
- [Next.js: Denial of Service in App Router using Server Actions](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) (high)
- [Next.js: Server-Side Request Forgery in Server Actions on custom servers](https://github.com/advisories/GHSA-89xv-2m56-2m9x) (high)
- [Next.js: Cache confusion of response bodies for requests with bodies](https://github.com/advisories/GHSA-68g3-v927-f742) (moderate)
- [Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences](https://github.com/advisories/GHSA-4633-3j49-mh5q) (moderate)
- [Next.js: Unbounded Server Action payload in Edge runtime](https://github.com/advisories/GHSA-4c39-4ccg-62r3) (moderate)
- [Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) (high)
- [Next.js: Denial of Service in the Image Optimization API using SVGs](https://github.com/advisories/GHSA-q8wf-6r8g-63ch) (moderate)
- [Next.js: Unauthenticated disclosure of internal Server Function endpoints](https://github.com/advisories/GHSA-955p-x3mx-jcvp) (moderate)
- [Next.js: Unauthenticated Remote Code Execution on windows-hosted servers](https://github.com/advisories/GHSA-p293-qw3h-jr36) (critical)
- [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) (critical)
- [Next.js: Remote Code Execution in next/og ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) (critical)

### postcss

- [PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) (moderate)
- [PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure](https://github.com/advisories/GHSA-r28c-9q8g-f849) (high)

### sharp

- [sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) (high)
- [sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) (high)

