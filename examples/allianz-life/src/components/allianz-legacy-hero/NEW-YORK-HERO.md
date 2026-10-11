# New York source hero modes

`AllianzLegacyHero.Default` retains its ordinary `col-sm-4` overlay. The new modes require exact native page fields; browser paths, route names, image filenames and the shared NY shell alone do not select them.

For `/new-york`, use runtime parameters `layout=home`, `position=right`, `productLine=none`, with route fields `shellFamily=legacy`, `legacySharedKey=new-york`, `sourceBodyId=page-new-york`, and `sourceBodyClasses=page-new-york new-york`. The component renders the source `col-sm-9 flexslider-col` / `col-sm-3 login-col` composition and the `right col-sm-5` notepad. The Layout uses a full-width content wrapper only for this exact identity and when no sidebar or right-rail placements are present. Existing side-rail placeholder behavior remains unchanged.

For `/new-york/annuities`, `layout=stage`, `position=right`, `productLine=none` with the equivalent exact identity using `sourceBodyId=page-annuities` and `sourceBodyClasses=page-annuities new-york` selects only its `col-sm-5` overlay. It retains its ordinary inner-page Layout and has no adjacent login column.

Hero heading, body, desktop/mobile images and optional primary link remain native fields. No fixture content or image is substituted when authored fields are cleared. The homepage source image is `nypublichome.jpg`, 848×350, alt `Allianz New York`; the existing local `/allianz-assets/6337e238c8635b7d.jpg` matches the current public image hash. Runtime does not hardcode that local file as a fallback. Native DAM image binding remains the native owner's responsibility.

Homepage account copy is code-owned and follows the source's static order. Username, Password and Remember me are disabled, nameless controls in every mode. Login, both recovery buttons and Register only open the shared local account-unavailable dialog. There is no form element, submitted/entered-value state, storage, account URL or service call. The legacy document-services dropdown remains unchanged.

Future binding uses existing rendering `{B642C279-575F-576F-B2C4-761765954A99}`, component `AllianzLegacyHero`, existing `Default` export, datasource template `{56B9D946-DDE4-5BFE-848D-8828B96800D8}`. No new native variant or CMS field has been created. `layout=home` and `layout=stage` are local runtime requirements; historical generic serialization contains a `layout` field, but current cloud editor support and a Default variant GUID have not been verified. Use the existing Default binding and preserve its native FieldNames rather than inventing a GUID. This change does not deploy code or bind native content.

The user-provided NY PageDesign is `{68109009-2EE5-4C22-9741-E5A195712255}`, with partial designs `{2D2E2F56-040D-4119-812C-6CE6F50D455C}` and `{605A4A0D-AD08-4C40-9234-EAA9E407A3B6}`. Retain these; their live contents have not been changed or queried here.

Source evidence: https://www.allianzlife.com/new-york and https://www.allianzlife.com/new-york/annuities, captured Oct10 2026. Geometry comes from the existing recovered legacy stylesheet with scoped corrections for current source notepad color, typography and margins. Grid switches at 768px; below that the notepad and both columns stack while the login remains visible. Browser visual and native editor acceptance QA must follow deployment.
