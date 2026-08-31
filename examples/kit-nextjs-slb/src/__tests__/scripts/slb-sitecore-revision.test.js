const {
  createContentRevision,
} = require('../../../scripts/lib/slb-sitecore-revision.cjs');

const revisionFieldId = '8cdc337e-a112-42fb-bbb4-4143751e123f';

function revision(fields) {
  return createContentRevision({
    itemId: '{525E6155-1724-C68B-8887-EC1B241E2E39}',
    scope: 'en:version:1',
    fields,
    revisionFieldIds: [revisionFieldId],
  });
}

describe('SLB Sitecore serialized revisions', () => {
  it('is stable across field ordering and repeated finalization', () => {
    const fields = [
      { ID: 'b', Value: 'second' },
      { ID: 'a', Value: 'first' },
    ];
    const initial = revision(fields);

    expect(revision([...fields].reverse())).toBe(initial);
    expect(revision([...fields, { ID: revisionFieldId, Value: initial }])).toBe(
      initial,
    );
  });

  it('changes when Content Hub image metadata changes', () => {
    const original = revision([
      {
        ID: 'image',
        Value:
          '<image src="https://example.test/a" dam-id="114111" width="1416" height="1140" />',
      },
    ]);
    const changed = revision([
      {
        ID: 'image',
        Value:
          '<image src="https://example.test/a" dam-id="114112" width="1416" height="1140" />',
      },
    ]);

    expect(changed).not.toBe(original);
  });

  it('changes when a localized language field changes', () => {
    expect(revision([{ ID: 'display-name', Value: 'Home' }])).not.toBe(
      revision([{ ID: 'display-name', Value: 'Inicio' }]),
    );
  });

  it('normalizes newline representations for cross-platform stability', () => {
    expect(revision([{ ID: 'layout', Value: 'first\r\nsecond' }])).toBe(
      revision([{ ID: 'layout', Value: 'first\nsecond' }]),
    );
  });
});
