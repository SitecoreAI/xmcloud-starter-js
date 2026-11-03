/* Private offline unchanged-source model reference. Not application code or financial certification. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');

const SOURCE = path.resolve(__dirname, '../../../../public/allianz-assets/rila-strategy/index-advantage-plus.js');
const SOURCE_HASH = 'ef767f7073bbbd3efc683f83a86d23e1160935f30f41c434f84a45c8629096ee';
const WORKBOOKS = {
  '/~/Media/Files/Global/ToolShed/dx-index-advantage-may-1/dx-index-advantage-xlsx.xlsx': {
    name: 'dx-index-advantage-xlsx.xlsx', bytes: 87969, sha256: '4d33b801c8dd3377277b8acd6d94a912e3d331ee386dfffb68cf7785aa58d34f',
  },
  '/~/Media/Files/Global/ToolShed/dx-index-advantage-may-1/iva.xlsx': {
    name: 'iva.xlsx', bytes: 1197565, sha256: 'd2c601cff456fa40adaa6dbf606374fcd331ddc3c809cac30ef3d626b6e2fae7',
  },
};
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

function extractSourceModel(sourceFile = SOURCE) {
  const sourceBytes = fs.readFileSync(sourceFile);
  if (hash(sourceBytes) !== SOURCE_HASH) throw new Error('SOURCE_HASH_MISMATCH');
  const program = ts.createProgram([sourceFile], { allowJs: true, noResolve: true, noLib: true, target: ts.ScriptTarget.Latest });
  const tree = program.getSourceFile(sourceFile);
  const checker = program.getTypeChecker();
  let mount;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer?.getText(tree).includes('document.getElementById("dx-index-advantage")')) mount = node;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  if (!mount) throw new Error('SOURCE_MOUNT_MISSING');
  let mountStatement = mount;
  while (!ts.isVariableStatement(mountStatement)) mountStatement = mountStatement.parent;
  const block = mountStatement.parent;
  if (!ts.isBlock(block)) throw new Error('SOURCE_MODEL_BLOCK_MISSING');
  const definitions = new Map(), names = new Map();
  const bindingNames = (node) => ts.isIdentifier(node) ? [node] : [...node.elements].flatMap((item) => item.name ? bindingNames(item.name) : []);
  for (const statement of block.statements) {
    const declarations = ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : ts.isFunctionDeclaration(statement) ? [statement] : [];
    for (const declaration of declarations) for (const name of bindingNames(declaration.name)) {
      const symbol = checker.getSymbolAtLocation(name);
      if (symbol) { definitions.set(symbol, declaration); names.set(name.text, declaration); }
    }
  }
  const references = (node) => {
    const result = new Set();
    const each = (child) => {
      if (ts.isIdentifier(child)) {
        const dependency = definitions.get(checker.getSymbolAtLocation(child));
        if (dependency && dependency !== node) result.add(dependency);
      }
      ts.forEachChild(child, each);
    };
    each(node);
    return result;
  };
  const selected = new Set();
  const include = (node) => {
    if (!node) throw new Error('SOURCE_ROOT_MISSING');
    if (selected.has(node)) return;
    selected.add(node);
    for (const dependency of references(node)) include(dependency);
  };
  for (const name of ['bX', 'u8', 'r9']) include(names.get(name));
  // Preserve source initialization side effects (e.g. MobX enums) for selected definitions.
  // Exclude the actual DOM mount and all subsequent UI rendering.
  let changed;
  do {
    changed = false;
    for (const statement of block.statements) {
      if (!ts.isExpressionStatement(statement) || statement.getStart(tree) >= mountStatement.getStart(tree) || selected.has(statement)) continue;
      if ([...references(statement)].some((dependency) => selected.has(dependency))) { include(statement); changed = true; }
    }
  } while (changed);
  const ordered = [...selected].sort((a, b) => a.getStart(tree) - b.getStart(tree));
  const source = tree.text;
  const extracted = source.slice(0, block.getStart(tree) + 1)
    + ordered.map((node) => (ts.isVariableDeclaration(node) ? 'var ' : '') + node.getText(tree) + (ts.isVariableDeclaration(node) ? ';' : '')).join('\n')
    + 'globalThis.__strategyReference={store:bX,transport:u8};' + source.slice(block.end - 1);
  return {
    extracted,
    metadata: {
      sourceBytes: sourceBytes.length,
      sourceSha256: SOURCE_HASH,
      sourceSelectedNodes: ordered.length,
      sourceInitializationStatements: ordered.filter((node) => ts.isExpressionStatement(node)).length,
      removedDomMountUtf16Offset: mountStatement.getStart(tree),
      extractedProgramSha256: hash(extracted),
      financialModelSourceHashes: Object.fromEntries(['yJ', 'yK', 'yq', 'bV'].map((name) => [name, hash(names.get(name).getText(tree))])),
      extraction: 'Dependency-selected original AST text and original module definitions. No model formulas reimplemented or changed. DOM rendering omitted.',
    },
  };
}

async function loadReference() {
  const { extracted, metadata } = extractSourceModel();
  const requests = [], sourceLogs = [], timers = new Set();
  const context = vm.createContext({
    console: { log(value) { sourceLogs.push(value?.name || typeof value); }, warn() {}, error() {} },
    setTimeout(callback, delay, ...args) { const timer = setTimeout(callback, delay, ...args); timers.add(timer); return timer; },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    window: { addEventListener() {}, removeEventListener() {} },
  }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(extracted, context, { timeout: 3000 });
  const reference = context.__strategyReference;
  reference.transport.get = (requestPath) => {
    const workbook = WORKBOOKS[requestPath];
    if (!workbook) throw new Error('UNREGISTERED_LOCAL_READ');
    const data = fs.readFileSync(path.resolve(__dirname, '../../../../public/~/Media/Files/Global/ToolShed/dx-index-advantage-may-1', workbook.name));
    if (data.length !== workbook.bytes || hash(data) !== workbook.sha256) throw new Error('WORKBOOK_HASH_MISMATCH');
    requests.push({ path: requestPath, bytes: data.length, sha256: workbook.sha256 });
    return Promise.resolve({ data });
  };
  const close = () => { for (const timer of timers) clearTimeout(timer); timers.clear(); };
  try {
    await reference.store.initialize();
    if (reference.store.uiStore.loading || sourceLogs.length) throw new Error('SOURCE_INITIALIZATION_FAILED');
    if (requests.length !== 2 || new Set(requests.map((request) => request.path)).size !== 2) throw new Error('SOURCE_WORKBOOK_CONTRACT_MISMATCH');
    return { store: reference.store, metadata, requests, close };
  } catch (error) { close(); throw error; }
}

module.exports = { loadReference, extractSourceModel, WORKBOOKS, SOURCE_HASH };
