/** Run with Node; transpiles only the pure validation module, without application side effects. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(file) {
  const filename = fileURLToPath(file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL('.', file)));
  compiled._compile(code, filename);
  return compiled.exports;
}
const { formDefinitions, visibleDefinitions, validateForm, MAX_POLICIES } = load(new URL('./form-rules.props.ts', import.meta.url));
const claim = formDefinitions('death-claim');
const values = {
  'StartClaimAbout.firstname': 'Avery', 'StartClaimAbout.lastname': 'Sample',
  'StartClaimAbout.DateOfDeathMonth': '1', 'StartClaimAbout.DateOfDeathDay': '31', 'StartClaimAbout.DateOfDeathYear': '2025',
  'StartClaimAbout.DateOfBirthMonth': '2', 'StartClaimAbout.DateOfBirthDay': '28', 'StartClaimAbout.DateOfBirthYear': '1970',
  'StartClaimAbout.Last4SSN': '1234',
  'StartClaimAboutYou.selectedrelationship': 'Child', 'StartClaimAboutYou.yourfirstname': 'Morgan', 'StartClaimAboutYou.yourlastname': 'Sample',
  'StartClaimAboutYou.emailaddress': 'morgan@example.invalid', 'StartClaimAboutYou.phone': '2025550148',
  'StartClaimAboutYou.address': '100 Sample Street', 'StartClaimAboutYou.city': 'Sample City', 'StartClaimAboutYou.selectedcountry': 'United States',
};
const shown = visibleDefinitions('death-claim', claim, values, 1);
assert.deepEqual(validateForm(shown, values, 'death-claim'), {}, 'valid synthetic claim reaches review');
assert.equal(shown.filter((field) => field.name.includes('policycontractnumber')).length, 1);
assert.equal(visibleDefinitions('death-claim', claim, values, 50).filter((field) => field.name.includes('policycontractnumber')).length, MAX_POLICIES, 'source 20-policy limit');
assert.ok(validateForm(shown, { ...values, 'StartClaimAbout.Last4SSN': '12a4' }, 'death-claim')['StartClaimAbout.Last4SSN']);
assert.ok(validateForm(shown, { ...values, 'StartClaimAbout.firstname': 'A'.repeat(71) }, 'death-claim')['StartClaimAbout.firstname']);
assert.ok(validateForm(shown, { ...values, 'StartClaimAbout.DateOfDeathMonth': '2', 'StartClaimAbout.DateOfDeathDay': '29' }, 'death-claim')['StartClaimAbout.DateOfDeathMonth'], 'non-leap February rejected');
assert.equal(validateForm(shown, { ...values, 'StartClaimAbout.DateOfDeathMonth': '2', 'StartClaimAbout.DateOfDeathDay': '29', 'StartClaimAbout.DateOfDeathYear': '2024' }, 'death-claim')['StartClaimAbout.DateOfDeathMonth'], undefined, 'leap day accepted');
assert.ok(validateForm(shown, { ...values, 'StartClaimAbout.DateOfBirthYear': '2026' }, 'death-claim')['StartClaimAbout.DateOfBirthMonth'], 'birth after death rejected');
assert.ok(validateForm(shown, { ...values, 'StartClaimAbout.policycontractnumber[0].PolicyNumber': 'A 12' }, 'death-claim')['StartClaimAbout.policycontractnumber[0].PolicyNumber']);
const contact = formDefinitions('new-york-contact');
const contactValues = { 'ContactUsReason.SelectedReason': 'Other', 'ProductCategory.SelectedCategories': ['Fixed'], 'ContactInfo.Name': 'Sample', 'ContactInfo.Email': 'sample@example.invalid', 'ContactInfo.Phone': '202-555-0148', 'ContactInfo.ZipCode': '55416', 'ContactInfo.Comment': 'Sample information only.' };
const contactShown = visibleDefinitions('new-york-contact', contact, contactValues, 1);
assert.deepEqual(validateForm(contactShown, contactValues, 'new-york-contact'), {}, 'inactive source-hidden controls not required');
assert.ok(validateForm(contactShown, { ...contactValues, 'ContactInfo.Email': '' }, 'new-york-contact')['ContactInfo.Email'], 'empty source-required email attribute remains required');
assert.ok(validateForm(contactShown, { ...contactValues, 'ContactInfo.Phone': '123' }, 'new-york-contact')['ContactInfo.Phone']);
assert.ok(validateForm(contactShown, { ...contactValues, 'ContactInfo.ZipCode': 'bad' }, 'new-york-contact')['ContactInfo.ZipCode']);
assert.ok(visibleDefinitions('new-york-contact', contact, { ...contactValues, 'ContactUsReason.SelectedReason': 'SellProducts' }, 1).some((field) => field.name === 'SelectFirm.SelectedFirm'));
assert.ok(!formDefinitions('generic', [{ id: 'excluded', name: { jsonValue: { value: 'password' } }, inputType: { jsonValue: { value: 'password' } } }]).length, 'credential controls cannot render');
const { searchPublicRoutes } = load(new URL('../allianz-search/search-rules.props.ts', import.meta.url));
const entries = [{ path: '/what-we-offer/annuities', title: 'Annuities', description: 'Retirement income' }, { path: '/new-york/annuities', title: 'New York annuities', description: 'Retirement options' }];
assert.equal(searchPublicRoutes(entries, 'retirement income').length, 1, 'all terms must match');
assert.equal(searchPublicRoutes(entries, 'annuities', 'new-york').length, 1, 'New York search stays in its public branch');
assert.equal(searchPublicRoutes(entries, '').length, 0);
const { RETIREMENT_INPUTS, validateCalculator } = load(new URL('../allianz-calculator/allianz-calculator.props.ts', import.meta.url));
assert.deepEqual(validateCalculator(RETIREMENT_INPUTS, { principal: '$1,000.00', interest: '4.50%', payments: '20' }), {}, 'formatted source inputs validate without computing a formula');
assert.ok(validateCalculator(RETIREMENT_INPUTS, { principal: '$1,000.00', interest: '4.50%', payments: '' }).payments, 'all captured retirement inputs are required');
assert.ok(validateCalculator(RETIREMENT_INPUTS, { principal: 'nan', interest: '4.50%', payments: '20' }).principal, 'non-numeric calculator input cannot proceed');
assert.ok(validateCalculator(RETIREMENT_INPUTS, { principal: '$1,000.00', interest: '4.50%', payments: '20.5' }).payments, 'local flow requires whole years');
assert.ok(validateCalculator(RETIREMENT_INPUTS, { principal: '-1', interest: '4.50%', payments: '20' }).principal, 'local flow rejects negative withdrawals');
const { localVideoSource } = load(new URL('../allianz-video/allianz-video.props.ts', import.meta.url));
assert.equal(localVideoSource('/allianz-assets/source-video.mp4'), '/allianz-assets/source-video.mp4', 'only authorized app-local media can play');
assert.equal(localVideoSource('https://players.brightcove.net/source.mp4'), '', 'external media is excluded');
assert.equal(localVideoSource('//players.brightcove.net/source.mp4'), '', 'protocol-relative media is excluded');
assert.equal(localVideoSource('/allianz-assets/../customer-api/source.mp4'), '', 'media cannot traverse out of the asset folder');
assert.equal(localVideoSource('/allianz-assets/source.js'), '', 'executable sources cannot be played as media');
console.log('28 local form, search, calculator, and safe-media assertions passed. No requests or input persistence.');
