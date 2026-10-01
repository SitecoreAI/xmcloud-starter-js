"""Offline layout/form regressions; source and node identities remain intact."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest

spec = importlib.util.spec_from_file_location('allianz_extract', Path(__file__).with_name('extract_public_content.py'))
extract = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = extract
spec.loader.exec_module(extract)


class RowSpacingTests(unittest.TestCase):
    def test_title_and_accordion_rows_do_not_share_spacing(self):
        dom = extract.DOM('''<section class="t-bg-transparent"><div class="l-grid">
          <div class="l-grid__row u-padding-top-lg u-margin-bottom-lg"><article class="intro"><h2>Title</h2></article></div>
          <div class="l-grid__row u-padding-bottom-xl"><div class="l-grid"><div class="l-grid__row justify-content-center"><div class="c-accordion"></div></div></div></div>
        </div></section>''').root
        section = dom.find('section')
        intro = extract.component_row_params(section, section.find(css='intro'))
        accordion = extract.component_row_params(section, section.find(css='c-accordion'))
        self.assertEqual((intro['paddingTop'], intro['paddingBottom'], intro['marginBottom']), ('lg', 'none', 'lg'))
        self.assertEqual((accordion['paddingTop'], accordion['paddingBottom'], accordion['marginBottom']), ('none', 'xl', 'none'))
        self.assertEqual(accordion['spacing'], 'none')

    def test_no_row_does_not_invent_padding(self):
        section = extract.DOM('<section class="t-bg-blue-soft"><div class="c-accordion"></div></section>').root.find('section')
        value = extract.component_row_params(section, section.find(css='c-accordion'))
        self.assertEqual(value['theme'], 'blue-soft')
        self.assertEqual([value[k] for k in ('paddingTop', 'paddingBottom', 'marginBottom', 'spacing')], ['none'] * 4)

    def test_card_collection_columns_do_not_come_from_full_width_intro(self):
        dom=extract.DOM('''<main><section><div class="l-grid__row"><div class="l-grid__column-medium-12">
          <article class="m-axlIntroductionBlock"><div class="tileHeading"><h2>Other helpful resources</h2></div></article>
          <div class="o-cards o-cards__col3"><a class="m-card"></a><a class="m-card"></a><a class="m-card"></a></div>
        </div></div></section></main>''').root
        original=extract.component('AllianzCardGrid',{'heading':extract.field_value('Other helpful resources')},extract.params(dom.find('section'),'cards',1),'/:section:0')
        uid,datasource=original['uid'],original['dataSource']
        result=extract.supplement_modern_components(dom.find('main'),[original],'https://www.allianzlife.com/','/')
        grid=next(row for row in result if row['uid']==uid)
        self.assertEqual(grid['params']['columns'],'3')
        self.assertEqual(grid['params']['layout'],'cards')
        self.assertEqual(grid['dataSource'],datasource)


class FormLabelTests(unittest.TestCase):
    PATH = '/new-york/contact-us'
    # Reduced original markup from html/daa409a40954b4cd.html, lines 479–647.
    SOURCE = '''<div class="center-column"><form id="ContactUsContainerPortletForm">
      <div class="form-group"><label class="control-label">My reason for contacting Allianz is</label>
        <div><div class="radio"><label for="Option1"><input id="Option1" type="radio" name="ContactUsReason.SelectedReason" value="QuestionContractPolicy" data-val-required="Please specify a reason">I have a question about a policy or contract (<a>login</a> recommended)</label></div>
        <div class="radio"><label for="Option2"><input id="Option2" type="radio" name="ContactUsReason.SelectedReason" value="SellProducts">I would like to become appointed to sell Allianz products</label></div></div>
      </div>
      <div class="form-group"><label for="SelectFirm_SelectedFirm">Select your firm*</label><div><input id="SelectFirm_SelectedFirm" name="SelectFirm.SelectedFirm" data-val-sitecore-labeltext="Select your firm" data-val-required="Required"></div></div>
      <div class="form-group"><label for="">Which product(s) do you want to learn more about?*</label><div><select name="_ProductSelector.SelectedProducts" data-val-sitecore-labeltext="Which product(s) do you want to learn more about?" data-val-required="Required"><option value="Variable">Variable annuities</option></select></div></div>
      <div class="form-group"><label for="ProductCategory_SelectedCategories">Select the product category about which you are inquiring*</label><div><select id="ProductCategory_SelectedCategories" name="ProductCategory.SelectedCategories" data-val-sitecore-labeltext="Select the product category about which you are inquiring" data-val-required="At least one product category needs to be selected"><option value="Fixed">Fixed annuities</option></select></div></div>
      <div class="form-group"><label for="ContactInfo_Name">Name*</label><div><input id="ContactInfo_Name" name="ContactInfo.Name" data-val-required="This field is required"></div></div>
      <div class="form-group"><label for="ContactInfo_Email">Email address*</label><div><input id="ContactInfo_Email" name="ContactInfo.Email" type="email" data-val-sitecore-labeltext="Email address" data-val-required=""></div></div>
      <div class="form-group"><label for="ContactInfo_Phone">Phone number*</label><div><input id="ContactInfo_Phone" name="ContactInfo.Phone" type="tel" data-val-sitecore-labeltext="Phone number" data-val-required="This field is required"></div></div>
      <div class="form-group"><label for="ContactInfo_ZipCode">Postal/Zip code*</label><div><input id="ContactInfo_ZipCode" name="ContactInfo.ZipCode" data-val-sitecore-labeltext="Postal/Zip code" data-val-required="This field is required"></div></div>
      <div class="form-group"><label for="ContactInfo_Comment">Comment*</label><div><textarea id="ContactInfo_Comment" name="ContactInfo.Comment" data-val-required="This field is required"></textarea></div></div>
    </form></div>'''
    LABELS = {
        'ContactUsReason.SelectedReason': 'My reason for contacting Allianz is',
        'SelectFirm.SelectedFirm': 'Select your firm*',
        '_ProductSelector.SelectedProducts': 'Which product(s) do you want to learn more about?*',
        'ProductCategory.SelectedCategories': 'Select the product category about which you are inquiring*',
        'ContactInfo.Name': 'Name*',
        'ContactInfo.Email': 'Email address*',
        'ContactInfo.Phone': 'Phone number*',
        'ContactInfo.ZipCode': 'Postal/Zip code*',
        'ContactInfo.Comment': 'Comment*',
    }

    def extract(self, source):
        row = {'final_url': extract.HOST + self.PATH, 'html_file': 'test-contact-source.html'}
        route, _ = extract.legacy_page(row, extract.DOM(source).root)
        return next(c for c in route['components'] if c['componentName'] == 'AllianzForm')

    def test_display_labels_preserve_source_markers_and_group_caption(self):
        form = self.extract(self.SOURCE)
        fields = form['fields']['data']['datasource']['children']['results']
        self.assertEqual({f['name']['jsonValue']['value']: f['label']['jsonValue']['value'] for f in fields}, self.LABELS)
        self.assertEqual(len([f for f in fields if f['inputType']['jsonValue']['value'] == 'radio']), 1)

    def test_empty_required_attribute_is_still_required(self):
        fields = self.extract(self.SOURCE)['fields']['data']['datasource']['children']['results']
        email = next(f for f in fields if f['name']['jsonValue']['value'] == 'ContactInfo.Email')
        self.assertTrue(email['required']['jsonValue']['value'])
        self.assertEqual(email['validationMessage']['jsonValue']['value'], '')

    def test_fieldset_legend_and_unbound_group_label_are_not_option_copy(self):
        for source in [
            '<fieldset><legend>Choose a reason</legend><label for="first"><input type="radio" id="first" name="reason">First option</label></fieldset>',
            '<div class="form-group"><label>Choose a reason</label><label for="first"><input type="radio" id="first" name="reason">First option</label></div>',
        ]:
            dom = extract.DOM(source).root
            self.assertEqual(extract.form_control_label(dom.find('input'), {'first': 'First option'}), 'Choose a reason')

    def test_missing_group_caption_keeps_existing_label_fallback(self):
        dom = extract.DOM('<label for="single"><input type="radio" id="single" name="reason">Single option</label>').root
        self.assertEqual(extract.form_control_label(dom.find('input'), {'single': 'Single option'}), 'Single option')
        dom = extract.DOM('<input name="contact" data-val-sitecore-labeltext="Contact detail">').root
        self.assertEqual(extract.form_control_label(dom.find('input'), {}), 'Contact detail')

    def test_field_identity_does_not_depend_on_label_text(self):
        for child in self.extract(self.SOURCE)['fields']['data']['datasource']['children']['results']:
            name = child['name']['jsonValue']['value']
            self.assertEqual(child['id'], extract.stable(self.PATH + ':form:' + name))
        email = next(child for child in self.extract(self.SOURCE)['fields']['data']['datasource']['children']['results'] if child['name']['jsonValue']['value'] == 'ContactInfo.Email')
        self.assertEqual(email['id'], '4434E565-C3D0-5731-ACED-E7B953998E58')

    def test_captured_contact_route_and_native_identity(self):
        content = json.loads((extract.OUTPUT / 'native-content.json').read_text())
        route = content['routes'][self.PATH]
        source_path = extract.ROOT / route['sourceHtml']
        if not source_path.exists():
            self.skipTest('Original public HTML capture is not present in this checkout')
        row = {'final_url': route['sourceUrl'], 'html_file': route['sourceHtml'], 'title': route['title'], 'archetype': route['archetype']}
        regenerated, _ = extract.legacy_page(row, extract.DOM(source_path.read_text()).root)
        self.assertEqual([(c['uid'], c['dataSource']) for c in regenerated['components']], [(c['uid'], c['dataSource']) for c in route['components']])
        original_form = next(c for c in route['components'] if c['componentName'] == 'AllianzForm')
        self.assertEqual(original_form['dataSource'], '5D130636-5B37-54FD-9444-673D1C11C6FA')
        extracted_form = next(c for c in regenerated['components'] if c['componentName'] == 'AllianzForm')
        original_fields = original_form['fields']['data']['datasource']['children']['results']
        extracted_fields = extracted_form['fields']['data']['datasource']['children']['results']
        self.assertEqual(extracted_fields, original_fields)
        self.assertEqual({f['name']['jsonValue']['value']: f['label']['jsonValue']['value'] for f in extracted_fields if f['name']['jsonValue']['value'] in self.LABELS}, self.LABELS)


if __name__ == '__main__':
    unittest.main()
