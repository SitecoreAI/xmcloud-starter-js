import type { Field } from '@sitecore-content-sdk/nextjs';

type RouteIdentityFields = Record<string, unknown> | undefined;
type ClaimPath = '/report-a-death' | '/new-york/report-a-death';

export const CLAIM_DEMO_INTRO = '<p>Demonstration only. Use sample information to try this form. Completing this demo does not report a death, submit a claim, look up policies or contracts, contact you or any beneficiary, or mail claim packets. No form information is sent to Allianz.</p>';

// Exact retained introductions only; later editorial changes must remain visible.
const NATIONAL_NATIVE_INTRO = '<p>Please use this form to notify us of a passing. Begin by entering information about the deceased, followed by your own contact details. </p>' +
  '<p>Once submitted, we’ll locate the appropriate Allianz® policies or contracts and send the listed beneficiary/beneficiaries a claim form packet with instructions for completing the claim. </p>' +
  '<p>If you are a financial professional or current Allianz® policyholder, please <a href="#demo-unavailable" title="This service is unavailable">register or log in</a> before completing the form below.</p>';
const NY_NATIVE_INTRO = NATIONAL_NATIVE_INTRO.replace('</a> before', '</a>\u00a0before');
const bundledIntro = (value: string) => value.replace('href="#demo-unavailable"', 'href="#demo-unavailable" data-demo-disabled="true"');
const CAPTURED_INTROS: Record<ClaimPath, readonly string[]> = {
  '/report-a-death': [NATIONAL_NATIVE_INTRO, bundledIntro(NATIONAL_NATIVE_INTRO)],
  '/new-york/report-a-death': [NY_NATIVE_INTRO, bundledIntro(NY_NATIVE_INTRO)],
};
const INTRO_DATASOURCE_IDS: Record<ClaimPath, readonly string[]> = {
  '/report-a-death': ['423B7D96-6772-5AEF-9FF8-00FB23CDA177', 'D656CE4C-8610-477E-855A-814EEC38C2D4'],
  '/new-york/report-a-death': ['2392532B-D1B6-56FE-9302-C7FF6F83E74A', 'BC19AFE3-A707-46A8-A9BD-4268CFF251F8'],
};
const normalizedId = (value: unknown) => typeof value === 'string' ? value.replace(/[{}-]/g, '').toLowerCase() : '';

function claimPath(pathname: string | null | undefined): ClaimPath | undefined {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) return undefined;
  let path = pathname.toLowerCase();
  if (path.startsWith('/sitecore/content/allianz/allianz-life/home/')) {
    path = path.slice('/sitecore/content/allianz/allianz-life/home'.length);
  } else if (path.startsWith('/allianz-life/en/')) {
    path = path.slice('/allianz-life/en'.length);
  }
  path = path.replace(/\/$/, '');
  return path === '/report-a-death' || path === '/new-york/report-a-death' ? path : undefined;
}

/** Route and captured market identity must agree; copied metadata cannot widen scope. */
export function isClaimDemoPage(fields: RouteIdentityFields, pathname: string | null | undefined): boolean {
  const path = claimPath(pathname);
  if (!path) return false;
  const value = (name: string) => (fields?.[name] as Field<string> | undefined)?.value;
  const isNewYork = path === '/new-york/report-a-death';
  return value('shellFamily') === 'legacy' && value('sourceBodyId') === 'page-report-a-death' &&
    value('legacySharedKey') === (isNewYork ? 'new-york' : 'allianz-life') &&
    value('sourceBodyClasses') === (isNewYork ? 'page-report-a-death new-york' : 'page-report-a-death');
}

/** Normal and preview visitors see demo copy; authoring retains the exact SDK Field. */
export function claimDemoIntroBody(field: Field<string> | undefined, fields: RouteIdentityFields,
  pathname: string | null | undefined, isEditing: boolean, datasourceId?: unknown): Field<string> | undefined {
  if (isEditing || !field || typeof field.value !== 'string') return field;
  const path = claimPath(pathname);
  if (!path || !isClaimDemoPage(fields, path) || !CAPTURED_INTROS[path].includes(field.value)) return field;
  // Some connected payloads omit id; when exposed, it must identify this exact intro.
  if (datasourceId !== undefined && datasourceId !== null && datasourceId !== '' &&
    !INTRO_DATASOURCE_IDS[path].some((id) => normalizedId(id) === normalizedId(datasourceId))) return field;
  return { ...field, value: CLAIM_DEMO_INTRO };
}
