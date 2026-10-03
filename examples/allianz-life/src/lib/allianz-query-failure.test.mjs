import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { ClientError } = require('graphql-request');
const filename = fileURLToPath(new URL('./allianz-query-failure.ts', import.meta.url));
const compiled = new Module(filename);
compiled.filename = filename;
compiled.require = (specifier) => specifier === 'server-only' ? {} : require(specifier);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { classifyQueryFailure } = compiled.exports;
const graphQL = (message, extensions, status = 400) => ({ response: { status, errors: [{ message, extensions }] } });

test('HTTP status alone classifies access, rate and upstream failures without inventing schema errors', () => {
  for (const [status, failureKind] of [[401, 'authentication'], [403, 'authorization'], [429, 'rate-limit'],
    [500, 'upstream'], [502, 'upstream'], [503, 'upstream'], [504, 'upstream'],
    [200, 'unknown'], [400, 'unknown'], [404, 'unknown'], [422, 'unknown']]) {
    assert.deepEqual(classifyQueryFailure({ response: { status } }), { failureKind, httpStatus: status });
  }
});

test('HTTP status is never coerced or taken from an unrelated property', () => {
  for (const status of [undefined, null, '401', true, NaN, Infinity, 99, 600, 401.5, { valueOf: () => 401 }]) {
    assert.deepEqual(classifyQueryFailure({ status: 401, response: { status } }), { failureKind: 'unknown' });
  }
});

test('GraphQL unknown fields, arguments and types are recognized from their response leaves', () => {
  for (const message of ['Cannot query field "baseTemplateIds" on type "ItemTemplate".',
    'Unknown argument "includeTemplateIDs" on field "children" of type "Item".',
    'Unknown type "ItemSearchInput".', 'Unknown field \'customField\' on type \'Item\'.',
    'Field "customField" is not defined by type "ItemInput".']) {
    assert.deepEqual(classifyQueryFailure(graphQL(message)), { failureKind: 'graphql-validation', httpStatus: 400 });
  }
  for (const extensions of [{ code: 'GRAPHQL_VALIDATION_FAILED' }, { code: 'UNKNOWN_ARGUMENT' },
    { classification: 'ValidationError' }, { codes: ['KNOWN_TYPE_NAMES'] }]) {
    assert.deepEqual(classifyQueryFailure(graphQL(undefined, extensions, 200)),
      { failureKind: 'graphql-validation', httpStatus: 200 });
  }
});

test('complexity leaves remain distinct from ordinary GraphQL validation and generic HTTP 400', () => {
  for (const message of ['Query is too complex to execute. The maximum allowed complexity is 1000.',
    'Query complexity of 1500 exceeds the maximum allowed complexity of 1000.',
    'Complexity limit exceeded.', 'The query complexity exceeds the configured maximum.']) {
    assert.deepEqual(classifyQueryFailure(graphQL(message, { code: 'GRAPHQL_VALIDATION_FAILED' })),
      { failureKind: 'complexity-limit', httpStatus: 400 });
  }
  for (const extensions of [{ code: 'COMPLEXITY' }, { code: 'COMPLEXITY_LIMIT_EXCEEDED' },
    { codes: ['QUERY_TOO_COMPLEX'] }]) {
    assert.deepEqual(classifyQueryFailure(graphQL(undefined, extensions)), { failureKind: 'complexity-limit', httpStatus: 400 });
  }
  assert.deepEqual(classifyQueryFailure(graphQL('Query is too complex to execute.', { codes: ['GRAPHQL_VALIDATION_FAILED'] })),
    { failureKind: 'complexity-limit', httpStatus: 400 });
});

test('GraphQL classification codes work with HTTP 200 and after unrecognized error leaves', () => {
  for (const [code, failureKind] of [['UNAUTHENTICATED', 'authentication'], ['FORBIDDEN', 'authorization'],
    ['RATE_LIMITED', 'rate-limit'], ['INTERNAL_SERVER_ERROR', 'upstream']]) {
    assert.deepEqual(classifyQueryFailure({ response: { status: 200, errors: [{ message: 'Other failure' }, { extensions: { code } }] } }),
      { failureKind, httpStatus: 200 });
  }
  assert.deepEqual(classifyQueryFailure(graphQL('Cannot query field "x" on type "Item".', undefined, 403)),
    { failureKind: 'authorization', httpStatus: 403 });
});

test('specific GraphQL categories outrank generic validation in the same error leaf', () => {
  for (const [classification, failureKind] of [['COMPLEXITY_LIMIT_EXCEEDED', 'complexity-limit'],
    ['UNAUTHENTICATED', 'authentication'], ['FORBIDDEN', 'authorization'],
    ['RATE_LIMITED', 'rate-limit'], ['INTERNAL_SERVER_ERROR', 'upstream']]) {
    assert.deepEqual(classifyQueryFailure(graphQL(undefined, { code: 'GRAPHQL_VALIDATION_FAILED', classification })),
      { failureKind, httpStatus: 400 });
    assert.deepEqual(classifyQueryFailure(graphQL(undefined, { code: 'GRAPHQL_VALIDATION_FAILED',
      codes: ['GRAPHQL_VALIDATION_FAILED', classification] })), { failureKind, httpStatus: 400 });
  }
});

test('specific categories outrank generic validation across error leaves in either order', () => {
  const generic = { extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } };
  for (const [code, failureKind] of [['COMPLEXITY_LIMIT_EXCEEDED', 'complexity-limit'],
    ['UNAUTHENTICATED', 'authentication'], ['FORBIDDEN', 'authorization'],
    ['RATE_LIMITED', 'rate-limit'], ['INTERNAL_SERVER_ERROR', 'upstream']]) {
    const specific = { extensions: { code } };
    for (const errors of [[generic, specific], [specific, generic]]) {
      assert.deepEqual(classifyQueryFailure({ response: { status: 200, errors } }), { failureKind, httpStatus: 200 });
    }
  }
  assert.deepEqual(classifyQueryFailure({ response: { status: 400,
    errors: [generic, { message: 'Query is too complex to execute.' }] } }),
  { failureKind: 'complexity-limit', httpStatus: 400 });
});

test('numeric access and rate statuses retain precedence over specific GraphQL classifications', () => {
  for (const [httpStatus, failureKind] of [[401, 'authentication'], [403, 'authorization'], [429, 'rate-limit']]) {
    assert.deepEqual(classifyQueryFailure({ response: { status: httpStatus, errors: [
      { extensions: { code: 'GRAPHQL_VALIDATION_FAILED', classification: 'COMPLEXITY_LIMIT_EXCEEDED' } },
      { extensions: { code: 'INTERNAL_SERVER_ERROR' } },
    ] } }), { failureKind, httpStatus });
  }
});

test('only allowlisted network codes and exact native fetch TypeErrors classify as network', () => {
  for (const code of ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT']) {
    assert.deepEqual(classifyQueryFailure({ code }), { failureKind: 'network' });
  }
  for (const message of ['fetch failed', 'Failed to fetch', 'Network request failed', 'Load failed']) {
    assert.deepEqual(classifyQueryFailure(new TypeError(message)), { failureKind: 'network' });
  }
  for (const error of [new Error('fetch failed'), new TypeError('fetch failed https://synthetic.invalid?key=secret'),
    { code: 'ENOTFOUND secret' }, { name: 'TypeError', message: 'fetch failed' },
    { cause: { code: 'ENOTFOUND' } }, { response: { status: 400 }, code: 'ENOTFOUND' }]) {
    assert.equal(classifyQueryFailure(error).failureKind, 'unknown');
  }
});

test('actual graphql-request wrapper secrets never escape the fixed result or get logged', (t) => {
  const secret = 'synthetic-do-not-disclose-secret';
  const error = new ClientError({ status: 400, headers: { Authorization: secret },
    errors: [{ message: `Cannot query field "${secret}" on type "Item".`,
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED', token: secret } }],
    data: { confidential: secret } }, { query: `query ${secret} { secret }`, variables: { key: secret } });
  error.url = `https://${secret}.invalid?key=${secret}`;
  error.cause = new Error(secret);
  error.apiKey = secret;
  const calls = [];
  for (const method of ['log', 'warn', 'error', 'debug', 'info']) t.mock.method(console, method, (...args) => calls.push(args));
  const result = classifyQueryFailure(error);
  assert.deepEqual(result, { failureKind: 'graphql-validation', httpStatus: 400 });
  assert.deepEqual(Reflect.ownKeys(result), ['failureKind', 'httpStatus']);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-do-not-disclose|query|headers|stack|cause|apiKey|https:/);
  assert.deepEqual(calls, []);
});

test('wrapper messages, causes, requests and headers are not read or searched for classifications', () => {
  const reads = [];
  const error = { response: { status: 400, errors: [{ message: 'Unrecognized response failure' }] } };
  for (const key of ['message', 'cause', 'request', 'headers', 'stack', 'url', 'apiKey']) {
    Object.defineProperty(error, key, { get() { reads.push(key); throw new Error('synthetic-private-data'); } });
  }
  Object.defineProperty(error.response, 'headers', { get() { reads.push('response.headers'); throw new Error('synthetic-private-data'); } });
  assert.deepEqual(classifyQueryFailure(error), { failureKind: 'unknown', httpStatus: 400 });
  assert.deepEqual(reads, []);
  for (const text of ['Cannot query field "secret" on type "Item".', 'Query is too complex to execute.', 'UNAUTHENTICATED']) {
    assert.deepEqual(classifyQueryFailure(new Error(text)), { failureKind: 'unknown' });
  }
});

test('throwing getters, proxies, cycles and strange primitives fail safely without retaining input', () => {
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const throwing = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('synthetic-private-data'); },
    getPrototypeOf() { throw new Error('synthetic-private-data'); } });
  const cycle = {}; cycle.cause = cycle; cycle.response = cycle;
  const accessor = {};
  for (const key of ['response', 'code', 'message']) Object.defineProperty(accessor, key, { get() { throw new Error('synthetic-private-data'); } });
  for (const input of [undefined, null, false, 401, NaN, 'synthetic-private-data', Symbol('synthetic-private-data'),
    1n, () => {}, [], cycle, revoked.proxy, throwing, accessor]) {
    assert.deepEqual(classifyQueryFailure(input), { failureKind: 'unknown' });
  }
  const response = { status: 503 };
  Object.defineProperty(response, 'errors', { get() { throw new Error('synthetic-private-data'); } });
  assert.deepEqual(classifyQueryFailure({ response }), { failureKind: 'upstream', httpStatus: 503 });
});

test('malformed classification leaves do not coerce, traverse or forward values', () => {
  const secret = { toString() { throw new Error('synthetic-private-data'); } };
  for (const errors of [null, 'GRAPHQL_VALIDATION_FAILED', {}, [null], [{ message: secret, extensions: { code: secret } }],
    [{ extensions: { code: 'constructor' } }], [{ extensions: { code: 'UNAUTHENTICATED synthetic-private-data' } }]]) {
    assert.deepEqual(classifyQueryFailure({ response: { status: 400, errors } }), { failureKind: 'unknown', httpStatus: 400 });
  }
  const sparseErrors = []; sparseErrors.length = 2 ** 32 - 1;
  assert.deepEqual(classifyQueryFailure({ response: { errors: sparseErrors } }), { failureKind: 'unknown' });
});
