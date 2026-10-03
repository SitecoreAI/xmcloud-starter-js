import 'server-only';
import { isProxy } from 'node:util/types';
import { Headers as CrossFetchHeaders } from 'cross-fetch';
import { Kind, parse, type FieldNode, type SelectionSetNode } from 'graphql';

export type QueryFailureKind =
  | 'graphql-validation'
  | 'complexity-limit'
  | 'authentication'
  | 'authorization'
  | 'rate-limit'
  | 'upstream'
  | 'network'
  | 'unknown';

export type QueryResponseFormat = 'json' | 'text' | 'other' | 'unknown';
export type QueryFailureEnvelope = 'object-errors' | 'string-json-errors' | 'text-body' | 'missing-data' | 'other';
export type QueryDataShape = 'absent' | 'null' | 'object' | 'array' | 'scalar';
export type QueryErrorSignature = 'unknown-field' | 'unknown-argument' | 'unknown-type' | 'required-argument'
  | 'invalid-argument' | 'syntax' | 'complexity' | 'unmatched';
export type QueryFieldCategory = 'root-item' | 'datasource-item' | 'template-identity' | 'parent-traversal'
  | 'children-connection' | 'content-field' | 'json-value' | 'item-url' | 'connection-metadata'
  | 'query-document' | 'unknown';

const recognizedCodes = [
  'GRAPHQL_VALIDATION_FAILED', 'ValidationError', 'UNKNOWN_FIELD', 'UNKNOWN_ARGUMENT', 'UNKNOWN_TYPE',
  'FIELDS_ON_CORRECT_TYPE', 'KNOWN_ARGUMENT_NAMES', 'KNOWN_TYPE_NAMES',
  'COMPLEXITY', 'COMPLEXITY_LIMIT_EXCEEDED', 'COMPLEXITY_EXCEEDED', 'QUERY_TOO_COMPLEX',
  'QUERY_COMPLEXITY_EXCEEDED', 'MAX_COMPLEXITY', 'MAX_DEPTH', 'QUERY_DEPTH_EXCEEDED',
  'UNAUTHENTICATED', 'UNAUTHORIZED', 'AUTHENTICATION_ERROR', 'FORBIDDEN', 'AUTHORIZATION_ERROR',
  'RATE_LIMITED', 'RATE_LIMIT_EXCEEDED', 'TOO_MANY_REQUESTS', 'INTERNAL_SERVER_ERROR',
  'SERVICE_UNAVAILABLE', 'BAD_GATEWAY', 'GATEWAY_TIMEOUT', 'GRAPHQL_PARSE_FAILED', 'SYNTAX_ERROR',
  'PROVIDED_REQUIRED_ARGUMENTS', 'PROVIDED_NON_NULL_ARGUMENTS', 'ARGUMENTS_OF_CORRECT_TYPE',
  'VALUES_OF_CORRECT_TYPE',
] as const;
export type QueryErrorCode = typeof recognizedCodes[number] | 'OTHER';
export type QueryErrorSummary = { code: QueryErrorCode; signature: QueryErrorSignature; fieldCategory: QueryFieldCategory };
export type QueryFailureDiagnostic = {
  failureKind: QueryFailureKind;
  httpStatus?: number;
  responseFormat: QueryResponseFormat;
  envelope: QueryFailureEnvelope;
  dataShape: QueryDataShape;
  graphqlErrorCount: number;
  countTruncated: boolean;
  errorSummaries: QueryErrorSummary[];
};

const maxErrors = 32;
const maxSummaries = 8;
const maxBodyBytes = 32 * 1024;
const allowedCodes = new Set<string>(recognizedCodes);

// Read only known data properties. Accessors, proxy traps and malformed values are untrusted.
function own(value: unknown, key: PropertyKey): unknown {
  if (typeof value !== 'object' || value === null || isProxy(value)) return undefined;
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
    case 'GRAPHQL_PARSE_FAILED': case 'SYNTAX_ERROR':
    case 'PROVIDED_REQUIRED_ARGUMENTS': case 'PROVIDED_NON_NULL_ARGUMENTS':
    case 'ARGUMENTS_OF_CORRECT_TYPE': case 'VALUES_OF_CORRECT_TYPE':
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

function arrayLength(value: unknown): number | undefined {
  if (isProxy(value) || !Array.isArray(value)) return undefined;
  const length = own(value, 'length');
  return typeof length === 'number' && Number.isSafeInteger(length) && length >= 0 ? length : undefined;
}

function errorCodes(error: unknown): QueryErrorCode[] {
  const extensions = own(error, 'extensions');
  const codes: QueryErrorCode[] = [];
  const accept = (value: unknown) => {
    if (typeof value === 'string' && allowedCodes.has(value)) codes.push(value as QueryErrorCode);
  };
  accept(own(extensions, 'code'));
  accept(own(extensions, 'classification'));
  const list = own(extensions, 'codes');
  const length = arrayLength(list);
  if (length !== undefined) for (let i = 0; i < Math.min(length, 16); i++) accept(own(list, String(i)));
  return codes;
}

function signature(error: unknown): QueryErrorSignature {
  const codes = errorCodes(error);
  if (codes.some((code) => codeKind(code) === 'complexity-limit')) return 'complexity';
  const message = own(error, 'message');
  if (typeof message === 'string' && message.length <= 8192) {
    if (complexityMessage(message)) return 'complexity';
    if (/^(?:Cannot query field|Unknown field)\s+["']/i.test(message) ||
      /^Field\s+["'][^"']+["']\s+is not defined by type\s+["']/i.test(message)) return 'unknown-field';
    if (/^Unknown argument\s+["']/i.test(message)) return 'unknown-argument';
    if (/^Unknown type\s+["']/i.test(message)) return 'unknown-type';
    if (/^Field\s+["'][^"']+["']\s+argument\s+["'][^"']+["']\s+of type\s+["'][^"']+["']\s+is required,?\s+but (?:it )?was not provided\.?$/i.test(message) ||
      /^Argument\s+["'][^"']+["']\s+of (?:required )?type\s+["'][^"']+["']\s+(?:was not provided|must not be null)\.?$/i.test(message)) return 'required-argument';
    if (/^Argument\s+["'][^"']+["']\s+has invalid value\b/i.test(message) ||
      /^Expected (?:value of )?type\s+["']/i.test(message) ||
      /^(?:Variable\s+["'][^"']+["']\s+got invalid value|(?:String|Int|Float|Boolean|ID) cannot represent)\b/i.test(message)) return 'invalid-argument';
    if (/^Syntax Error\b/i.test(message)) return 'syntax';
  }
  for (const code of codes) {
    switch (code) {
      case 'UNKNOWN_FIELD': case 'FIELDS_ON_CORRECT_TYPE': return 'unknown-field';
      case 'UNKNOWN_ARGUMENT': case 'KNOWN_ARGUMENT_NAMES': return 'unknown-argument';
      case 'UNKNOWN_TYPE': case 'KNOWN_TYPE_NAMES': return 'unknown-type';
      case 'PROVIDED_REQUIRED_ARGUMENTS': case 'PROVIDED_NON_NULL_ARGUMENTS': return 'required-argument';
      case 'ARGUMENTS_OF_CORRECT_TYPE': case 'VALUES_OF_CORRECT_TYPE': return 'invalid-argument';
      case 'GRAPHQL_PARSE_FAILED': case 'SYNTAX_ERROR': return 'syntax';
    }
  }
  return 'unmatched';
}

function complexityMessage(message: string): boolean {
  return /^Query (?:is |was )?too complex\b/i.test(message) ||
    /\b(?:query|document) complexity\b.{0,100}\b(?:exceed(?:ed|s)?|maximum|limit)\b/i.test(message) ||
    /\bcomplexity (?:limit|threshold) (?:was |is )?exceed(?:ed|s)?\b/i.test(message) ||
    /^The (?:query |document )?(?:complexity|depth)\b.{0,100}\b(?:exceed(?:ed|s)?|maximum|limit)\b/i.test(message);
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
  const length = arrayLength(codes);
  if (length !== undefined) {
      for (let i = 0; i < Math.min(length, 16); i++) {
        const kind = codeKind(own(codes, String(i)));
        if (kind === 'graphql-validation') validation = true;
        else if (kind) return kind;
      }
  }
  const message = own(error, 'message');
  if (typeof message === 'string' && message.length <= 8192) {
    if (complexityMessage(message)) {
      return 'complexity-limit';
    }
    if (/^(?:Cannot query field|Unknown (?:field|argument|type))\s+["']/i.test(message) ||
      /^Field\s+["'][^"']+["']\s+is not defined by type\s+["']/i.test(message)) {
      return 'graphql-validation';
    }
    if (['required-argument', 'invalid-argument', 'syntax'].includes(signature(error))) return 'graphql-validation';
  }
  return validation ? 'graphql-validation' : undefined;
}

const networkCodes = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT',
  'ESOCKETTIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
]);

function nativeTypeError(error: unknown): boolean {
  let value = error;
  for (let depth = 0; depth < 16; depth++) {
    if (typeof value !== 'object' || value === null || isProxy(value)) return false;
    value = Object.getPrototypeOf(value);
    if (value === TypeError.prototype) return true;
  }
  return false;
}

// Call the native implementation rather than a potentially hostile headers.get accessor.
const nativeHeadersGet = typeof Headers === 'undefined' ? undefined
  : Object.getOwnPropertyDescriptor(Headers.prototype, 'get')?.value as ((name: string) => string | null) | undefined;
const crossFetchHeaderMap = Object.getOwnPropertySymbols(new CrossFetchHeaders())
  .find((symbol) => symbol.description === 'map');

/** node-fetch 2's public get() traverses a mutable map and joins its values. Read that slot defensively. */
function crossFetchContentType(headers: unknown): string | undefined {
  if (typeof headers !== 'object' || headers === null || isProxy(headers) || !crossFetchHeaderMap ||
    Object.getPrototypeOf(headers) !== CrossFetchHeaders.prototype) return undefined;
  const map = own(headers, crossFetchHeaderMap);
  if (typeof map !== 'object' || map === null || isProxy(map)) return undefined;
  const names = Object.getOwnPropertyNames(map);
  if (names.length > 128) return undefined;
  const keys = names.filter((name) => name.length <= 256 && name.toLowerCase() === 'content-type');
  if (keys.length !== 1) return undefined;
  const values = own(map, keys[0]);
  const length = arrayLength(values);
  if (length === undefined || length === 0 || length > 8) return undefined;
  const safeValues: string[] = [];
  for (let i = 0; i < length; i++) {
    const value = own(values, String(i));
    if (typeof value !== 'string' || value.length > 256) return undefined;
    safeValues.push(value);
  }
  const value = safeValues.join(', ');
  return value.length <= 256 ? value : undefined;
}

function contentType(response: unknown): string | undefined {
  const headers = own(response, 'headers');
  let value = own(headers, 'content-type') ?? own(headers, 'Content-Type');
  if (value === undefined && typeof headers === 'object' && headers !== null && !isProxy(headers) && nativeHeadersGet &&
    Object.getPrototypeOf(headers) === Headers.prototype) {
    try { value = nativeHeadersGet.call(headers, 'content-type'); } catch { /* An unbranded object has no native headers. */ }
  }
  if (value === undefined) value = crossFetchContentType(headers);
  if (typeof value !== 'string' || value.length > 256) return undefined;
  const mime = value.split(';', 1)[0].trim().toLowerCase();
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mime) ? mime : undefined;
}

function responseFormat(mime: string | undefined): QueryResponseFormat {
  if (!mime) return 'unknown';
  if (mime === 'application/json' || (mime.startsWith('application/') && mime.endsWith('+json'))) return 'json';
  return mime.startsWith('text/') ? 'text' : 'other';
}

function dataShape(response: unknown): QueryDataShape {
  const data = own(response, 'data');
  if (data === undefined) return 'absent';
  if (data === null) return 'null';
  if (arrayLength(data) !== undefined) return 'array';
  return typeof data === 'object' ? 'object' : 'scalar';
}

type QueryField = { key: string; category: QueryFieldCategory; children: QueryField[] };
type QueryLocation = { start: number; end: number; category: QueryFieldCategory };
type QueryIndex = { roots: QueryField[][]; locations: QueryLocation[]; lineStarts: number[]; lineEnds: number[] };

function fieldCategory(field: FieldNode, inherited: QueryFieldCategory, root: boolean): QueryFieldCategory {
  const name = field.name.value;
  if (root && name === 'item') return field.alias?.value === 'datasource' ? 'datasource-item' : 'root-item';
  if (name === 'template') return 'template-identity';
  if (name === 'parent') return 'parent-traversal';
  if (name === 'children') return 'children-connection';
  if (name === 'field') return 'content-field';
  if (name === 'jsonValue') return 'json-value';
  if (name === 'url') return 'item-url';
  if (['total', 'pageInfo', 'hasNext', 'hasNextPage', 'endCursor', 'results', 'edges', 'nodes', 'cursor'].includes(name)) return 'connection-metadata';
  if (name === 'search' && root) return 'query-document';
  return inherited === 'connection-metadata' || inherited === 'children-connection' ? 'unknown' : inherited;
}

/** Index only the supplied document; response strings never create fields or names in the tree. */
function queryIndex(query: string | undefined): QueryIndex | undefined {
  if (typeof query !== 'string' || query.length > 64 * 1024) return undefined;
  try {
    const document = parse(query, { maxTokens: 4096 });
    const fragments = new Map(document.definitions.filter((definition) => definition.kind === Kind.FRAGMENT_DEFINITION)
      .map((definition) => [definition.name.value, definition]));
    const index: QueryIndex = { roots: [], locations: [], lineStarts: [0], lineEnds: [] };
    for (let i = 0; i < query.length; i++) {
      if (query[i] === '\r' || query[i] === '\n') {
        index.lineEnds.push(i);
        if (query[i] === '\r' && query[i + 1] === '\n') i++;
        index.lineStarts.push(i + 1);
      }
    }
    index.lineEnds.push(query.length);
    let visited = 0;
    const fields = (selection: SelectionSetNode, inherited: QueryFieldCategory, root: boolean,
      depth: number, expanded: Set<string>): QueryField[] => {
      if (depth > 32) throw new Error('Diagnostic query nesting limit');
      const result: QueryField[] = [];
      for (const node of selection.selections) {
        if (++visited > 8192) throw new Error('Diagnostic query selection limit');
        if (node.kind === Kind.FIELD) {
          const category = fieldCategory(node, inherited, root);
          // A field's selection set belongs to its descendants; its arguments belong to the field.
          if (node.loc) index.locations.push({ start: node.loc.start,
            end: node.selectionSet?.loc?.start ?? node.loc.end, category });
          result.push({ key: node.alias?.value ?? node.name.value, category,
            children: node.selectionSet ? fields(node.selectionSet, category, false, depth + 1, expanded) : [] });
        } else if (node.kind === Kind.INLINE_FRAGMENT) {
          result.push(...fields(node.selectionSet, inherited, root, depth + 1, expanded));
        } else {
          const name = node.name.value;
          const fragment = fragments.get(name);
          if (fragment && !expanded.has(name)) {
            result.push(...fields(fragment.selectionSet, inherited, root, depth + 1, new Set([...expanded, name])));
          }
        }
      }
      return result;
    };
    for (const definition of document.definitions) {
      if (definition.kind === Kind.OPERATION_DEFINITION) index.roots.push(fields(definition.selectionSet, 'query-document', true, 0, new Set()));
    }
    return index;
  } catch { return undefined; }
}

function locationCategory(error: unknown, index: QueryIndex): QueryFieldCategory | undefined {
  const locations = own(error, 'locations');
  const length = arrayLength(locations);
  if (length === undefined || length === 0 || length > 8) return undefined;
  const categories = new Set<QueryFieldCategory>();
  for (let i = 0; i < length; i++) {
    const location = own(locations, String(i));
    const line = own(location, 'line'), column = own(location, 'column');
    if (typeof line !== 'number' || !Number.isSafeInteger(line) || line < 1 || line > index.lineStarts.length ||
      typeof column !== 'number' || !Number.isSafeInteger(column) || column < 1) return undefined;
    const offset = index.lineStarts[line - 1] + column - 1;
    if (offset > index.lineEnds[line - 1]) return undefined;
    const matches = index.locations.filter((field) => offset >= field.start && offset < field.end);
    const fieldCategories = new Set(matches.map((field) => field.category));
    categories.add(fieldCategories.size === 1 ? matches[0].category : matches.length ? 'unknown' : 'query-document');
  }
  return categories.size === 1 ? [...categories][0] : 'unknown';
}

function pathCategory(error: unknown, index: QueryIndex): QueryFieldCategory | undefined {
  const path = own(error, 'path');
  const length = arrayLength(path);
  if (length === undefined || length === 0 || length > 64) return undefined;
  const keys: string[] = [];
  for (let i = 0; i < length; i++) {
    const value = own(path, String(i));
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) continue;
    if (typeof value !== 'string' || value.length > 256) return undefined;
    keys.push(value);
  }
  if (!keys.length) return undefined;
  let candidates = index.roots.flat();
  for (let i = 0; i < keys.length; i++) {
    const matched = candidates.filter((field) => field.key === keys[i]);
    if (!matched.length) return undefined;
    if (i === keys.length - 1) {
      const categories = new Set(matched.map((field) => field.category));
      return categories.size === 1 ? matched[0].category : 'unknown';
    }
    candidates = matched.flatMap((field) => field.children);
  }
  return undefined;
}

function summarize(error: unknown, index: QueryIndex | undefined): QueryErrorSummary {
  const codes = errorCodes(error);
  const errorSignature = signature(error);
  const preferred = codes.find((code) => codeKind(code) !== 'graphql-validation') ?? codes[0];
  return { code: preferred ?? 'OTHER', signature: errorSignature,
    fieldCategory: index ? locationCategory(error, index) ?? pathCategory(error, index) ?? 'unknown' : 'unknown' };
}

function responseShape(response: unknown): {
  responseFormat: QueryResponseFormat; envelope: QueryFailureEnvelope; dataShape: QueryDataShape; errors: unknown;
} {
  const mime = contentType(response);
  const format = responseFormat(mime);
  let body = response, fromString = false;
  const text = own(response, 'error');
  if (mime === 'text/plain' && typeof text === 'string' && text.length <= maxBodyBytes && Buffer.byteLength(text, 'utf8') <= maxBodyBytes) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) { body = parsed; fromString = true; }
    } catch { /* Malformed text remains a text body. */ }
  }
  const errors = own(body, 'errors');
  const length = arrayLength(errors);
  const shape = dataShape(body);
  const envelope: QueryFailureEnvelope = length !== undefined && length > 0 ? (fromString ? 'string-json-errors' : 'object-errors')
    : typeof text === 'string' && !fromString ? 'text-body'
      : typeof body === 'object' && body !== null && !isProxy(body) && errors === undefined && (shape === 'absent' || shape === 'null') ? 'missing-data'
        : typeof body === 'object' && body !== null && !isProxy(body) && length === 0 && (shape === 'absent' || shape === 'null') ? 'missing-data' : 'other';
  return { responseFormat: format, envelope, dataShape: shape, errors };
}

/** Return bounded fixed categories, never response bodies, names, arguments, requests or credentials. */
export function classifyQueryFailure(error: unknown, query?: string): QueryFailureDiagnostic {
  let httpStatus: number | undefined;
  const fallback: QueryFailureDiagnostic = { failureKind: 'unknown', responseFormat: 'unknown', envelope: 'other',
    dataShape: 'absent', graphqlErrorCount: 0, countTruncated: false, errorSummaries: [] };
  try {
    const response = own(error, 'response');
    const status = own(response, 'status');
    if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) {
      httpStatus = status;
    }
    let failureKind: QueryFailureKind | undefined = httpStatus === 401 ? 'authentication'
      : httpStatus === 403 ? 'authorization' : httpStatus === 429 ? 'rate-limit' : undefined;
    const shape = responseShape(response);
    const errors = shape.errors, length = arrayLength(errors);
    if (!failureKind && length !== undefined) {
        for (let i = 0; i < Math.min(length, maxErrors); i++) {
          const kind = graphQLKind(own(errors, String(i)));
          if (kind === 'graphql-validation') failureKind = kind;
          else if (kind) { failureKind = kind; break; }
        }
    }
    if (!failureKind && httpStatus !== undefined && httpStatus >= 500) failureKind = 'upstream';
    if (!failureKind && response === undefined) {
      const code = own(error, 'code');
      if (typeof code === 'string' && networkCodes.has(code)) failureKind = 'network';
      else if (nativeTypeError(error) &&
        ['fetch failed', 'Failed to fetch', 'Network request failed', 'Load failed'].includes(own(error, 'message') as string)) {
        failureKind = 'network';
      }
    }
    const index = length ? queryIndex(query) : undefined;
    const errorSummaries: QueryErrorSummary[] = [];
    for (let i = 0; i < Math.min(length ?? 0, maxSummaries); i++) errorSummaries.push(summarize(own(errors, String(i)), index));
    return { failureKind: failureKind ?? 'unknown', ...(httpStatus === undefined ? {} : { httpStatus }),
      responseFormat: shape.responseFormat, envelope: shape.envelope, dataShape: shape.dataShape,
      graphqlErrorCount: Math.min(length ?? 0, maxErrors), countTruncated: (length ?? 0) > maxErrors, errorSummaries };
  } catch {
    return { ...fallback, ...(httpStatus === undefined ? {} : { httpStatus }) };
  }
}
