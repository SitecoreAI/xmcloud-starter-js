import 'server-only';

export type QueryFailureKind =
  | 'graphql-validation'
  | 'complexity-limit'
  | 'authentication'
  | 'authorization'
  | 'rate-limit'
  | 'upstream'
  | 'network'
  | 'unknown';

export type QueryFailureDiagnostic = { failureKind: QueryFailureKind; httpStatus?: number };

// Read only known data properties. Accessors, proxy traps and malformed values are untrusted.
function own(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function codeKind(code: unknown): QueryFailureKind | undefined {
  switch (code) {
    case 'GRAPHQL_VALIDATION_FAILED': case 'ValidationError':
    case 'UNKNOWN_FIELD': case 'UNKNOWN_ARGUMENT': case 'UNKNOWN_TYPE':
    case 'FIELDS_ON_CORRECT_TYPE': case 'KNOWN_ARGUMENT_NAMES': case 'KNOWN_TYPE_NAMES':
      return 'graphql-validation';
    case 'COMPLEXITY': case 'COMPLEXITY_LIMIT_EXCEEDED': case 'COMPLEXITY_EXCEEDED':
    case 'QUERY_TOO_COMPLEX': case 'QUERY_COMPLEXITY_EXCEEDED': case 'MAX_COMPLEXITY':
    case 'MAX_DEPTH': case 'QUERY_DEPTH_EXCEEDED':
      return 'complexity-limit';
    case 'UNAUTHENTICATED': case 'UNAUTHORIZED': case 'AUTHENTICATION_ERROR':
      return 'authentication';
    case 'FORBIDDEN': case 'AUTHORIZATION_ERROR':
      return 'authorization';
    case 'RATE_LIMITED': case 'RATE_LIMIT_EXCEEDED': case 'TOO_MANY_REQUESTS':
      return 'rate-limit';
    case 'INTERNAL_SERVER_ERROR': case 'SERVICE_UNAVAILABLE': case 'BAD_GATEWAY':
    case 'GATEWAY_TIMEOUT':
      return 'upstream';
    default:
      return undefined;
  }
}

function graphQLKind(error: unknown): QueryFailureKind | undefined {
  const extensions = own(error, 'extensions');
  let validation = false;
  for (const key of ['code', 'classification']) {
    const kind = codeKind(own(extensions, key));
    if (kind === 'graphql-validation') validation = true;
    else if (kind) return kind;
  }
  const codes = own(extensions, 'codes');
  if (Array.isArray(codes)) {
    const length = own(codes, 'length');
    if (typeof length === 'number') {
      for (let i = 0; i < Math.min(length, 16); i++) {
        const kind = codeKind(own(codes, String(i)));
        if (kind === 'graphql-validation') validation = true;
        else if (kind) return kind;
      }
    }
  }
  const message = own(error, 'message');
  if (typeof message === 'string' && message.length <= 8192) {
    if (/^Query (?:is |was )?too complex\b/i.test(message) ||
      /\b(?:query|document) complexity\b.{0,100}\b(?:exceed(?:ed|s)?|maximum|limit)\b/i.test(message) ||
      /\bcomplexity (?:limit|threshold) (?:was |is )?exceed(?:ed|s)?\b/i.test(message) ||
      /^The (?:query |document )?(?:complexity|depth)\b.{0,100}\b(?:exceed(?:ed|s)?|maximum|limit)\b/i.test(message)) {
      return 'complexity-limit';
    }
    if (/^(?:Cannot query field|Unknown (?:field|argument|type))\s+["']/i.test(message) ||
      /^Field\s+["'][^"']+["']\s+is not defined by type\s+["']/i.test(message)) {
      return 'graphql-validation';
    }
  }
  return validation ? 'graphql-validation' : undefined;
}

const networkCodes = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT',
  'ESOCKETTIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
]);

/** Sanitize a transport error to a fixed category and an optional numeric HTTP status. */
export function classifyQueryFailure(error: unknown): QueryFailureDiagnostic {
  let httpStatus: number | undefined;
  try {
    const response = own(error, 'response');
    const status = own(response, 'status');
    if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) {
      httpStatus = status;
    }
    let failureKind: QueryFailureKind | undefined = httpStatus === 401 ? 'authentication'
      : httpStatus === 403 ? 'authorization' : httpStatus === 429 ? 'rate-limit' : undefined;
    const errors = own(response, 'errors');
    if (!failureKind && Array.isArray(errors)) {
      const length = own(errors, 'length');
      if (typeof length === 'number') {
        for (let i = 0; i < Math.min(length, 32); i++) {
          const kind = graphQLKind(own(errors, String(i)));
          if (kind === 'graphql-validation') failureKind = kind;
          else if (kind) { failureKind = kind; break; }
        }
      }
    }
    if (!failureKind && httpStatus !== undefined && httpStatus >= 500) failureKind = 'upstream';
    if (!failureKind && response === undefined) {
      const code = own(error, 'code');
      if (typeof code === 'string' && networkCodes.has(code)) failureKind = 'network';
      else if (error instanceof TypeError &&
        ['fetch failed', 'Failed to fetch', 'Network request failed', 'Load failed'].includes(own(error, 'message') as string)) {
        failureKind = 'network';
      }
    }
    return { failureKind: failureKind ?? 'unknown', ...(httpStatus === undefined ? {} : { httpStatus }) };
  } catch {
    return { failureKind: 'unknown', ...(httpStatus === undefined ? {} : { httpStatus }) };
  }
}
