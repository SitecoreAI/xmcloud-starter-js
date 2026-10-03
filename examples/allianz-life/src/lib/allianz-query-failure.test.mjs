import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { ClientError } = require('graphql-request');
const { GraphQLRequestClient } = require('@sitecore-content-sdk/core');
const { Headers: CrossFetchHeaders } = require('cross-fetch');
const { getLocation, Source } = require('graphql');
const filename = fileURLToPath(new URL('./allianz-query-failure.ts', import.meta.url));
const compiled = new Module(filename);
compiled.filename = filename;
compiled.require = (specifier) => specifier === 'server-only' ? {} : require(specifier);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { classifyQueryFailure } = compiled.exports;
const classifyLegacy = (error) => {
  const { failureKind, httpStatus } = classifyQueryFailure(error);
  return { failureKind, ...(httpStatus === undefined ? {} : { httpStatus }) };
};
const graphQL = (message, extensions, status = 400) => ({ response: { status, errors: [{ message, extensions }] } });

test('HTTP status alone classifies access, rate and upstream failures without inventing schema errors', () => {
  for (const [status, failureKind] of [[401, 'authentication'], [403, 'authorization'], [429, 'rate-limit'],
    [500, 'upstream'], [502, 'upstream'], [503, 'upstream'], [504, 'upstream'],
    [200, 'unknown'], [400, 'unknown'], [404, 'unknown'], [422, 'unknown']]) {
    assert.deepEqual(classifyLegacy({ response: { status } }), { failureKind, httpStatus: status });
  }
});

test('HTTP status is never coerced or taken from an unrelated property', () => {
  for (const status of [undefined, null, '401', true, NaN, Infinity, 99, 600, 401.5, { valueOf: () => 401 }]) {
    assert.deepEqual(classifyLegacy({ status: 401, response: { status } }), { failureKind: 'unknown' });
  }
});

test('GraphQL unknown fields, arguments and types are recognized from their response leaves', () => {
  for (const message of ['Cannot query field "baseTemplateIds" on type "ItemTemplate".',
    'Unknown argument "includeTemplateIDs" on field "children" of type "Item".',
    'Unknown type "ItemSearchInput".', 'Unknown field \'customField\' on type \'Item\'.',
    'Field "customField" is not defined by type "ItemInput".']) {
    assert.deepEqual(classifyLegacy(graphQL(message)), { failureKind: 'graphql-validation', httpStatus: 400 });
  }
  for (const extensions of [{ code: 'GRAPHQL_VALIDATION_FAILED' }, { code: 'UNKNOWN_ARGUMENT' },
    { classification: 'ValidationError' }, { codes: ['KNOWN_TYPE_NAMES'] }]) {
    assert.deepEqual(classifyLegacy(graphQL(undefined, extensions, 200)),
      { failureKind: 'graphql-validation', httpStatus: 200 });
  }
});

test('complexity leaves remain distinct from ordinary GraphQL validation and generic HTTP 400', () => {
  for (const message of ['Query is too complex to execute. The maximum allowed complexity is 1000.',
    'Query complexity of 1500 exceeds the maximum allowed complexity of 1000.',
    'Complexity limit exceeded.', 'The query complexity exceeds the configured maximum.']) {
    assert.deepEqual(classifyLegacy(graphQL(message, { code: 'GRAPHQL_VALIDATION_FAILED' })),
      { failureKind: 'complexity-limit', httpStatus: 400 });
  }
  for (const extensions of [{ code: 'COMPLEXITY' }, { code: 'COMPLEXITY_LIMIT_EXCEEDED' },
    { codes: ['QUERY_TOO_COMPLEX'] }]) {
    assert.deepEqual(classifyLegacy(graphQL(undefined, extensions)), { failureKind: 'complexity-limit', httpStatus: 400 });
  }
  assert.deepEqual(classifyLegacy(graphQL('Query is too complex to execute.', { codes: ['GRAPHQL_VALIDATION_FAILED'] })),
    { failureKind: 'complexity-limit', httpStatus: 400 });
});

test('GraphQL classification codes work with HTTP 200 and after unrecognized error leaves', () => {
  for (const [code, failureKind] of [['UNAUTHENTICATED', 'authentication'], ['FORBIDDEN', 'authorization'],
    ['RATE_LIMITED', 'rate-limit'], ['INTERNAL_SERVER_ERROR', 'upstream']]) {
    assert.deepEqual(classifyLegacy({ response: { status: 200, errors: [{ message: 'Other failure' }, { extensions: { code } }] } }),
      { failureKind, httpStatus: 200 });
  }
  assert.deepEqual(classifyLegacy(graphQL('Cannot query field "x" on type "Item".', undefined, 403)),
    { failureKind: 'authorization', httpStatus: 403 });
});

test('specific GraphQL categories outrank generic validation in the same error leaf', () => {
  for (const [classification, failureKind] of [['COMPLEXITY_LIMIT_EXCEEDED', 'complexity-limit'],
    ['UNAUTHENTICATED', 'authentication'], ['FORBIDDEN', 'authorization'],
    ['RATE_LIMITED', 'rate-limit'], ['INTERNAL_SERVER_ERROR', 'upstream']]) {
    assert.deepEqual(classifyLegacy(graphQL(undefined, { code: 'GRAPHQL_VALIDATION_FAILED', classification })),
      { failureKind, httpStatus: 400 });
    assert.deepEqual(classifyLegacy(graphQL(undefined, { code: 'GRAPHQL_VALIDATION_FAILED',
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
      assert.deepEqual(classifyLegacy({ response: { status: 200, errors } }), { failureKind, httpStatus: 200 });
    }
  }
  assert.deepEqual(classifyLegacy({ response: { status: 400,
    errors: [generic, { message: 'Query is too complex to execute.' }] } }),
  { failureKind: 'complexity-limit', httpStatus: 400 });
});

test('numeric access and rate statuses retain precedence over specific GraphQL classifications', () => {
  for (const [httpStatus, failureKind] of [[401, 'authentication'], [403, 'authorization'], [429, 'rate-limit']]) {
    assert.deepEqual(classifyLegacy({ response: { status: httpStatus, errors: [
      { extensions: { code: 'GRAPHQL_VALIDATION_FAILED', classification: 'COMPLEXITY_LIMIT_EXCEEDED' } },
      { extensions: { code: 'INTERNAL_SERVER_ERROR' } },
    ] } }), { failureKind, httpStatus });
  }
});

test('only allowlisted network codes and exact native fetch TypeErrors classify as network', () => {
  for (const code of ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT']) {
    assert.deepEqual(classifyLegacy({ code }), { failureKind: 'network' });
  }
  for (const message of ['fetch failed', 'Failed to fetch', 'Network request failed', 'Load failed']) {
    assert.deepEqual(classifyLegacy(new TypeError(message)), { failureKind: 'network' });
  }
  for (const error of [new Error('fetch failed'), new TypeError('fetch failed https://synthetic.invalid?key=secret'),
    { code: 'ENOTFOUND secret' }, { name: 'TypeError', message: 'fetch failed' },
    { cause: { code: 'ENOTFOUND' } }, { response: { status: 400 }, code: 'ENOTFOUND' }]) {
    assert.equal(classifyLegacy(error).failureKind, 'unknown');
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
  const result = classifyQueryFailure(error, `query ${secret.replaceAll('-', '_')} { root: item(path: "${secret}") { id } }`);
  assert.deepEqual(result, expected({ failureKind: 'graphql-validation', httpStatus: 400,
    envelope: 'object-errors', dataShape: 'object', graphqlErrorCount: 1,
    errorSummaries: [{ code: 'GRAPHQL_VALIDATION_FAILED', signature: 'unknown-field', fieldCategory: 'unknown' }] }));
  assert.deepEqual(Reflect.ownKeys(result), ['failureKind', 'httpStatus', 'responseFormat', 'envelope', 'dataShape',
    'graphqlErrorCount', 'countTruncated', 'errorSummaries']);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-do-not-disclose|headers|stack|cause|apiKey|https:/);
  assert.deepEqual(calls, []);
});

function expected(overrides = {}) {
  return { failureKind: 'unknown', responseFormat: 'unknown', envelope: 'other', dataShape: 'absent',
    graphqlErrorCount: 0, countTruncated: false, errorSummaries: [], ...overrides };
}

const query = `query Diagnostic($first: Int = 10) {
  root: item(path: "synthetic-private-item-id", language: "en") {
    id url { path } parent { id }
    template { id baseTemplateIds }
    children(first: $first) {
      total pageInfo { hasNext endCursor }
      results { id heading: field(name: "synthetic-private-content-name") { jsonValue } ...ItemFields mystery }
    }
  }
  datasource: item(path: "synthetic-private-datasource-id", language: "en") { id }
  search(where: { name: "_language", value: "en" }, first: $first) { results { template { id } } total }
}
fragment ItemFields on Item { title: field(name: "synthetic-private-field-name") { jsonValue } }`;

const location = (needle, document = query) => getLocation(new Source(document), document.indexOf(needle));
const summaryFor = (leaf, document = query) => classifyQueryFailure({ response: { errors: [leaf] } }, document).errorSummaries[0];

async function sdkFailure(body, contentType = 'application/json', status = 200, document = query) {
  let calls = 0;
  const client = new GraphQLRequestClient('https://synthetic.invalid/graphql', {
    fetch: async () => { calls++; return new Response(body, { status, headers: { 'Content-Type': contentType } }); },
    retries: 1, retryStrategy: { shouldRetry: () => false }, debugger: () => {},
  });
  let error;
  try { await client.request(document); } catch (failure) { error = failure; }
  assert.ok(error, 'The installed SDK must reject the synthetic response');
  assert.equal(calls, 1, 'All requests use the local fake fetch and make no live calls');
  return classifyQueryFailure(error, document);
}

test('responseFormat depends only on Content-Type and never guesses from the body', () => {
  for (const [contentType, responseFormat] of [['application/json', 'json'], ['APPLICATION/JSON; charset=UTF-8', 'json'],
    ['application/graphql+json', 'json'], ['application/graphql-response+json', 'json'], ['application/vendor+json', 'json'],
    ['text/plain; charset=utf-8', 'text'], ['text/html', 'text'], ['application/octet-stream', 'other'],
    ['', 'unknown'], [undefined, 'unknown'], [null, 'unknown'], [123, 'unknown'], ['secret', 'unknown']]) {
    for (const headers of [{ 'content-type': contentType }, { 'Content-Type': contentType }]) {
      const result = classifyQueryFailure({ response: { headers, error: '{"errors":[{"extensions":{"code":"FORBIDDEN"}}]}' } });
      assert.equal(result.responseFormat, responseFormat);
      if (contentType !== 'text/plain; charset=utf-8') assert.equal(result.graphqlErrorCount, 0);
    }
  }
  assert.equal(classifyQueryFailure({ response: { errors: [{ extensions: { code: 'FORBIDDEN' } }] } }).responseFormat, 'unknown');
});

test('native Headers Content-Type reads bypass arbitrary get accessors and unrelated headers', () => {
  const reads = [];
  const headers = new Headers({ 'Content-Type': 'application/json', Authorization: 'synthetic-private-token' });
  Object.defineProperty(headers, 'get', { get() { reads.push('get'); throw new Error('synthetic-private-token'); } });
  const result = classifyQueryFailure({ response: { headers, errors: [{ extensions: { code: 'UNKNOWN_FIELD' } }] } });
  assert.equal(result.responseFormat, 'json');
  assert.deepEqual(reads, []);
  const hostile = {};
  for (const key of ['content-type', 'Content-Type', 'get', 'Authorization', 'forEach']) {
    Object.defineProperty(hostile, key, { get() { reads.push(key); throw new Error('synthetic-private-token'); } });
  }
  assert.equal(classifyQueryFailure({ response: { headers: hostile } }).responseFormat, 'unknown');
  assert.deepEqual(reads, []);
});

test('actual installed SDK default cross-fetch transport recognizes its response Headers safely', async () => {
  let contentType = 'application/json';
  const body = JSON.stringify({ data: null, errors: [{ extensions: { code: 'PROVIDED_REQUIRED_ARGUMENTS' },
    locations: [location('datasource: item')] }] });
  // Loopback only: exercise the SDK's untouched default transport, with no CMS or external endpoint.
  const server = http.createServer((request, response) => {
    request.resume();
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(body);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    for (const [mime, responseFormat, envelope] of [['application/json', 'json', 'object-errors'],
      ['text/plain; charset=UTF-8', 'text', 'string-json-errors']]) {
      contentType = mime;
      const client = new GraphQLRequestClient(`http://127.0.0.1:${server.address().port}/graphql`, {
        retries: 1, retryStrategy: { shouldRetry: () => false }, debugger: () => {},
      });
      let error;
      try { await client.request(query); } catch (failure) { error = failure; }
      assert.ok(error);
      assert.equal(Object.getPrototypeOf(error.response.headers), CrossFetchHeaders.prototype);
      assert.deepEqual(classifyQueryFailure(error, query), expected({ failureKind: 'graphql-validation', httpStatus: 200,
        responseFormat, envelope, dataShape: 'null', graphqlErrorCount: 1,
        errorSummaries: [{ code: 'PROVIDED_REQUIRED_ARGUMENTS', signature: 'required-argument', fieldCategory: 'datasource-item' }] }));
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('cross-fetch compatibility adapter skips hostile map, value and method accessors', () => {
  const reads = [];
  const header = () => new CrossFetchHeaders({ 'cOnTeNt-TyPe': 'application/json', Authorization: 'synthetic-private' });
  const healthy = header();
  Object.defineProperty(healthy, 'get', { get() { reads.push('get'); throw new Error('synthetic-private'); } });
  assert.equal(classifyQueryFailure({ response: { headers: healthy } }).responseFormat, 'json');
  const mapSymbol = Object.getOwnPropertySymbols(healthy).find((key) => key.description === 'map');
  for (const mutation of [
    (headers) => Object.defineProperty(headers, mapSymbol, { get() { reads.push('map'); throw new Error('synthetic-private'); } }),
    (headers) => Object.defineProperty(headers[mapSymbol], 'cOnTeNt-TyPe', { get() { reads.push('content-type'); throw new Error('synthetic-private'); } }),
    (headers) => Object.defineProperty(headers[mapSymbol]['cOnTeNt-TyPe'], '0', { get() { reads.push('value'); throw new Error('synthetic-private'); } }),
    (headers) => { headers[mapSymbol] = new Proxy({}, { ownKeys() { reads.push('keys'); throw new Error('synthetic-private'); } }); },
    (headers) => { headers[mapSymbol]['cOnTeNt-TyPe'] = [{ toString() { reads.push('coerce'); throw new Error('synthetic-private'); } }]; },
  ]) {
    const headers = header(); mutation(headers);
    assert.equal(classifyQueryFailure({ response: { headers } }).responseFormat, 'unknown');
  }
  assert.deepEqual(reads, []);
});

test('actual installed SDK JSON and text/plain JSON expose the same bounded GraphQL leaves', async () => {
  const body = JSON.stringify({ data: null, errors: [{ message: 'Unknown argument "unsupported" on field "Item.children".',
    extensions: { code: 'KNOWN_ARGUMENT_NAMES', secret: 'synthetic-private-token' }, locations: [location('first: $first')] }] });
  for (const [contentType, responseFormat, envelope] of [['application/json', 'json', 'object-errors'],
    ['application/graphql-response+json', 'json', 'object-errors'], ['text/plain; charset=utf-8', 'text', 'string-json-errors']]) {
    const result = await sdkFailure(body, contentType);
    assert.deepEqual(result, expected({ failureKind: 'graphql-validation', httpStatus: 200, responseFormat, envelope,
      dataShape: 'null', graphqlErrorCount: 1,
      errorSummaries: [{ code: 'KNOWN_ARGUMENT_NAMES', signature: 'unknown-argument', fieldCategory: 'children-connection' }] }));
    assert.doesNotMatch(JSON.stringify(result), /unsupported|synthetic-private|Item.children|headers|request/);
  }
});

test('actual installed SDK reports data:null and absent data as missing-data without inventing errors', async () => {
  for (const [body, dataShape] of [['{"data":null}', 'null'], ['{}', 'absent'], ['{"errors":[]}', 'absent']]) {
    assert.deepEqual(await sdkFailure(body), expected({ httpStatus: 200, responseFormat: 'json', envelope: 'missing-data', dataShape }));
  }
  assert.deepEqual(await sdkFailure('{"data":null}', 'text/plain'), expected({ httpStatus: 200,
    responseFormat: 'text', envelope: 'missing-data', dataShape: 'null' }));
});

test('actual SDK malformed, oversized, and non-plain text stay text-body without message classification', async () => {
  for (const [body, contentType] of [['{"errors":', 'text/plain'],
    ['Cannot query field "synthetic-private" on type "Item".', 'text/plain'],
    [JSON.stringify({ errors: [{ extensions: { code: 'FORBIDDEN' } }], secret: 'x'.repeat(32768) }), 'text/plain'],
    [JSON.stringify({ errors: [{ extensions: { code: 'FORBIDDEN' } }] }), 'text/html']]) {
    assert.deepEqual(await sdkFailure(body, contentType), expected({ httpStatus: 200, responseFormat: 'text', envelope: 'text-body' }));
  }
});

test('text parsing is bounded by UTF-8 bytes, includes exactly 32KiB, and reads only own response.error', async () => {
  const minimal = JSON.stringify({ errors: [{ extensions: { code: 'FORBIDDEN' } }] });
  const exact = minimal + ' '.repeat(32768 - Buffer.byteLength(minimal));
  assert.equal((await sdkFailure(exact, 'text/plain')).failureKind, 'authorization');
  const multibyte = JSON.stringify({ errors: [{ extensions: { code: 'FORBIDDEN' } }], secret: 'é'.repeat(16400) });
  assert.ok(multibyte.length < 32768 && Buffer.byteLength(multibyte) > 32768);
  assert.deepEqual(await sdkFailure(multibyte, 'text/plain'), expected({ httpStatus: 200, responseFormat: 'text', envelope: 'text-body' }));
  for (const response of [{ headers: { 'content-type': 'text/plain' }, body: minimal, message: minimal },
    Object.assign(Object.create({ error: minimal }), { headers: { 'content-type': 'text/plain' } })]) {
    assert.equal(classifyQueryFailure({ response }).graphqlErrorCount, 0);
  }
});

test('dataShape classifies the immediate data property without visiting private contents', () => {
  for (const [data, dataShape] of [[undefined, 'absent'], [null, 'null'], [{ secret: 'synthetic-private' }, 'object'],
    [['synthetic-private'], 'array'], ['synthetic-private', 'scalar'], [false, 'scalar'], [123, 'scalar']]) {
    const result = classifyQueryFailure({ response: { data } });
    assert.equal(result.dataShape, dataShape);
    assert.equal(result.envelope, data === undefined || data === null ? 'missing-data' : 'other');
    assert.doesNotMatch(JSON.stringify(result), /synthetic-private/);
  }
});

test('error counts cap at 32, summaries cap at 8, and sparse or malformed arrays remain bounded', () => {
  for (const count of [0, 1, 8, 9, 32, 33, 200]) {
    const errors = Array.from({ length: count }, () => ({ extensions: { code: 'UNKNOWN_FIELD' } }));
    const result = classifyQueryFailure({ response: { errors } });
    assert.equal(result.graphqlErrorCount, Math.min(count, 32));
    assert.equal(result.countTruncated, count > 32);
    assert.equal(result.errorSummaries.length, Math.min(count, 8));
  }
  const sparse = []; sparse.length = 2 ** 32 - 1;
  let reads = 0;
  Object.defineProperty(sparse, '0', { get() { reads++; throw new Error('synthetic-private'); } });
  Object.defineProperty(sparse, '32', { get() { reads++; throw new Error('synthetic-private'); } });
  const result = classifyQueryFailure({ response: { errors: sparse } });
  assert.equal(result.graphqlErrorCount, 32);
  assert.equal(result.countTruncated, true);
  assert.equal(result.errorSummaries.length, 8);
  assert.equal(reads, 0);
  for (const errors of ['synthetic-private', { length: 400, 0: { extensions: { code: 'FORBIDDEN' } } }, null]) {
    assert.equal(classifyQueryFailure({ response: { errors } }).graphqlErrorCount, 0);
  }
});

test('new allowlisted validation codes produce only fixed signatures and preserve HTTP precedence', () => {
  for (const [code, signature] of [['GRAPHQL_PARSE_FAILED', 'syntax'], ['SYNTAX_ERROR', 'syntax'],
    ['PROVIDED_REQUIRED_ARGUMENTS', 'required-argument'], ['PROVIDED_NON_NULL_ARGUMENTS', 'required-argument'],
    ['ARGUMENTS_OF_CORRECT_TYPE', 'invalid-argument'], ['VALUES_OF_CORRECT_TYPE', 'invalid-argument']]) {
    const error = { extensions: { code } };
    assert.deepEqual(summaryFor(error), { code, signature, fieldCategory: 'unknown' });
    assert.equal(classifyQueryFailure({ response: { status: 200, errors: [error] } }).failureKind, 'graphql-validation');
    assert.equal(classifyQueryFailure({ response: { status: 401, errors: [error] } }).failureKind, 'authentication');
  }
  assert.deepEqual(summaryFor({ message: 'synthetic-private', extensions: { code: 'synthetic-private-unknown-code' } }),
    { code: 'OTHER', signature: 'unmatched', fieldCategory: 'unknown' });
});

test('actual SDK required arguments and bounded message signatures are recognized without retaining words', async () => {
  for (const message of ['Field "item" argument "path" of type "String!" is required, but it was not provided.',
    'Argument "path" of required type "String!" was not provided.', 'Argument "path" of type "String!" must not be null.']) {
    const result = await sdkFailure(JSON.stringify({ errors: [{ message, locations: [location('root: item')] }] }), 'text/plain');
    assert.equal(result.failureKind, 'graphql-validation');
    assert.deepEqual(result.errorSummaries, [{ code: 'OTHER', signature: 'required-argument', fieldCategory: 'root-item' }]);
  }
  for (const [message, signature] of [['Unknown type "SyntheticPrivateType".', 'unknown-type'],
    ['Argument "first" has invalid value "private".', 'invalid-argument'], ['Syntax Error: Unexpected "private".', 'syntax']]) {
    assert.equal(summaryFor({ message }).signature, signature);
  }
  assert.equal(summaryFor({ message: 'Unknown field "' + 'x'.repeat(8192) }).signature, 'unmatched');
});

test('numeric locations map fields, argument positions and fragment type positions through the supplied AST', () => {
  for (const [needle, fieldCategory] of [['root: item', 'root-item'], ['datasource: item', 'datasource-item'],
    ['baseTemplateIds', 'template-identity'], ['parent { id }', 'parent-traversal'], ['first: $first', 'children-connection'],
    ['heading: field', 'content-field'], ['jsonValue', 'json-value'], ['url { path }', 'item-url'],
    ['hasNext', 'connection-metadata'], ['where: {', 'query-document'], ['on Item', 'query-document'], ['mystery', 'unknown']]) {
    assert.equal(summaryFor({ locations: [location(needle)] }).fieldCategory, fieldCategory, needle);
  }
  const crlf = query.replaceAll('\n', '\r\n');
  assert.equal(summaryFor({ locations: [location('baseTemplateIds', crlf)] }, crlf).fieldCategory, 'template-identity');
  assert.equal(summaryFor({ locations: [location('title: field')] }).fieldCategory, 'content-field');
  assert.equal(summaryFor({ locations: [location('root: item'), location('datasource: item')] }).fieldCategory, 'unknown');
});

test('paths match query aliases and fragment selections, discard indices, and reject unknown or crossed branches', () => {
  for (const [path, fieldCategory] of [[['root'], 'root-item'], [['datasource', 'id'], 'datasource-item'],
    [['root', 'template', 'baseTemplateIds'], 'template-identity'], [['root', 'parent', 'id'], 'parent-traversal'],
    [['root', 'children'], 'children-connection'], [['root', 'children', 'pageInfo', 'hasNext'], 'connection-metadata'],
    [['root', 'children', 'results', 0, 'heading'], 'content-field'],
    [['root', 'children', 'results', 999, 'title', 'jsonValue'], 'json-value'], [['root', 'url', 'path'], 'item-url'],
    [['root', 'synthetic-private'], 'unknown'], [['root', 'template', 'jsonValue'], 'unknown'],
    [['root', 'children', 'results', 'field'], 'unknown'], [[0, 1], 'unknown'], [['datasource', 'url'], 'unknown']]) {
    assert.equal(summaryFor({ path }).fieldCategory, fieldCategory, JSON.stringify(path));
  }
});

test('invalid locations and paths cannot coerce values, read accessors, or create categories from messages', () => {
  const coercion = { valueOf() { throw new Error('synthetic-private'); }, toString() { throw new Error('synthetic-private'); } };
  for (const locations of [[{ line: '1', column: 1 }], [{ line: 0, column: 1 }], [{ line: 1, column: NaN }],
    [{ line: 999, column: 1 }], [{ line: 1, column: 999999 }], [{ line: 1, column: coercion }], [null], Array(9).fill({ line: 1, column: 1 })]) {
    assert.equal(summaryFor({ locations }).fieldCategory, 'unknown');
  }
  for (const path of [['root', -1], ['root', 0.1], ['root', coercion], Array(65).fill('root'), [undefined]]) {
    assert.equal(summaryFor({ path }).fieldCategory, 'unknown');
  }
  assert.equal(summaryFor({ message: 'Cannot query field "template" on type "Item".' }).fieldCategory, 'unknown');
  assert.equal(summaryFor({ locations: [location('template')] }, 'query { broken(').fieldCategory, 'unknown');
  assert.equal(summaryFor({ path: ['root'] }, ' '.repeat(65537)).fieldCategory, 'unknown');
});

test('hostile proxies and accessors at every diagnostic leaf are skipped without triggering traps', () => {
  const reads = [];
  const proxy = (target = {}) => new Proxy(target, {
    get() { reads.push('get'); throw new Error('synthetic-private'); },
    getOwnPropertyDescriptor() { reads.push('descriptor'); throw new Error('synthetic-private'); },
    getPrototypeOf() { reads.push('prototype'); throw new Error('synthetic-private'); },
  });
  const revoked = Proxy.revocable([], {}); revoked.revoke();
  const accessor = {};
  for (const key of ['message', 'extensions', 'locations', 'path', 'code', 'classification', 'codes', 'line', 'column']) {
    Object.defineProperty(accessor, key, { get() { reads.push(key); throw new Error('synthetic-private'); } });
  }
  for (const error of [proxy(), Object.create(proxy()), { response: proxy() }, { response: { errors: proxy([]) } },
    { response: { errors: revoked.proxy } }, { response: { errors: [proxy(), accessor] } },
    { response: { headers: proxy(), errors: [{ extensions: proxy(), locations: proxy([]), path: proxy([]) }] } },
    { response: { headers: Object.create(proxy()), errors: [{ extensions: proxy() }] } },
    { response: { errors: [{ extensions: { codes: proxy([]) }, locations: [accessor], path: [accessor] }] } }]) {
    assert.doesNotThrow(() => classifyQueryFailure(error, query));
    assert.doesNotMatch(JSON.stringify(classifyQueryFailure(error, query)), /synthetic-private/);
  }
  assert.deepEqual(reads, []);
});

test('wrapper messages, causes, requests and headers are not read or searched for classifications', () => {
  const reads = [];
  const error = { response: { status: 400, errors: [{ message: 'Unrecognized response failure' }] } };
  for (const key of ['message', 'cause', 'request', 'headers', 'stack', 'url', 'apiKey']) {
    Object.defineProperty(error, key, { get() { reads.push(key); throw new Error('synthetic-private-data'); } });
  }
  Object.defineProperty(error.response, 'headers', { get() { reads.push('response.headers'); throw new Error('synthetic-private-data'); } });
  assert.deepEqual(classifyLegacy(error), { failureKind: 'unknown', httpStatus: 400 });
  assert.deepEqual(reads, []);
  for (const text of ['Cannot query field "secret" on type "Item".', 'Query is too complex to execute.', 'UNAUTHENTICATED']) {
    assert.deepEqual(classifyLegacy(new Error(text)), { failureKind: 'unknown' });
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
    assert.deepEqual(classifyLegacy(input), { failureKind: 'unknown' });
  }
  const response = { status: 503 };
  Object.defineProperty(response, 'errors', { get() { throw new Error('synthetic-private-data'); } });
  assert.deepEqual(classifyLegacy({ response }), { failureKind: 'upstream', httpStatus: 503 });
});

test('malformed classification leaves do not coerce, traverse or forward values', () => {
  const secret = { toString() { throw new Error('synthetic-private-data'); } };
  for (const errors of [null, 'GRAPHQL_VALIDATION_FAILED', {}, [null], [{ message: secret, extensions: { code: secret } }],
    [{ extensions: { code: 'constructor' } }], [{ extensions: { code: 'UNAUTHENTICATED synthetic-private-data' } }]]) {
    assert.deepEqual(classifyLegacy({ response: { status: 400, errors } }), { failureKind: 'unknown', httpStatus: 400 });
  }
  const sparseErrors = []; sparseErrors.length = 2 ** 32 - 1;
  assert.deepEqual(classifyLegacy({ response: { errors: sparseErrors } }), { failureKind: 'unknown' });
});
