# Kirkland alert demo runbook

Use the configured **BlackRock Meta Data Center Venture** alert for all four loops. Keeping one record throughout makes the relationship, authoring, workflow, and publishing story easy to follow.

## Readiness gates

- Deploy the Kirkland editing host before the rehearsal, and verify the alert in Page Builder at the default 1024 px desktop width, tablet width, and phone width.
- Pull the `Kirkland.Demo` and `kirkland-page-branches` serialization modules after connecting the Sitecore CLI. The module files define intentionally narrow boundaries; they do not replace a serialization pull and do not contain fabricated item YAML.
- Publish the **News Article** page-branch wrapper, its configured rule, and the branch contents. Confirm that **News Article** is a creation option under **News and Insights**.
- Deploy the editing host containing **Article CTA Slot**. In Page Builder, confirm that its empty `kirkland-article-cta-{*}` drop zone is visible only while editing and offers **CTA Banner** as its sole allowed component.
- When validating through the marketer MCP, request the current page version explicitly. An unversioned HTML request can return version 1 instead of the latest Approved version.
- Keep one prior version of the alert approved and published. Keep the current version, its article-body datasource, and any page-level or shared datasource that will be edited in **Draft** until the authoring loop.
- In Content Editor, confirm that the Required validator is visible for Author, Practice, and Office, and that Submit and Approve are blocked while any one of those fields is empty.
- Verify the named Author, Reviewer, and Publisher accounts before the demo. The Reviewer must be able to execute the configured Approve and Reject commands, and the Publisher must have explicit publish rights.
- Use a real reviewer session. If role switching is not practical, prepare a verified screenshot from that session; never imply that an unverified or simulated account is live.

## Configured records

| Purpose          | Configured item                                |
| ---------------- | ---------------------------------------------- |
| Alert            | BlackRock Meta Data Center Venture             |
| Author           | Allan Kirk                                     |
| Practice         | Mergers & Acquisitions                         |
| Office           | Houston                                        |
| Content type     | Deal Announcement                              |
| Topic            | Digital Infrastructure                         |
| Related insights | UK National Security and Investment Act Update |
| Language         | English                                        |

The relationship fields on the alert are `author`, `relatedPractice`, `relatedOffice`, and `relatedInsights`. The inherited `taxAuthor` field is a deprecated compatibility fallback and is not the authoring field for current versions.

## News and Insights reference baseline

| Article                                        | Author                | Practice                | Office  | Content type      | Topic                                    | Related insight                                |
| ---------------------------------------------- | --------------------- | ----------------------- | ------- | ----------------- | ---------------------------------------- | ---------------------------------------------- |
| BlackRock Meta Data Center Venture             | Allan Kirk            | Mergers & Acquisitions  | Houston | Deal Announcement | Digital Infrastructure                   | UK National Security and Investment Act Update |
| PAI Partners Pasubio Refinancing               | Cedric Van den Borren | Capital Markets         | London  | Deal Announcement | Capital Markets and Financing            | None                                           |
| UK National Security and Investment Act Update | Mark Gardner          | Antitrust & Competition | London  | Kirkland Alert    | Foreign Investment and National Security | BlackRock Meta Data Center Venture             |

## Loop 1 — public experience

1. Open `/News-and-Insights/BlackRock-Meta-Data-Center-Venture` in a clean browser session.
2. Point out the headline, summary, linked lawyer author, **Mergers & Acquisitions** practice, **Houston** office, related insight, content type, topic, and English-language context.
3. Follow **Allan Kirk** to his lawyer profile, and then follow **Mergers & Acquisitions** to its configured practice page.
4. Use this sentence exactly:

   > SitecoreAI links approved content records that Kirkland has configured.

5. Describe only authored and approved record links. Do not describe inferred relationships between people, inferred interests, visitor behavior, or recommendations based on behavior.

**Value statement:** Kirkland controls the approved records and relationships; the public experience renders those trusted connections consistently.

## Loop 2 — Page Builder authoring checkpoint

1. Sign in as the Author, and open the Kirkland site and the alert in Page Builder.
2. Show the configured and published **News Article** page branch as the pattern for new alerts, then continue with the current BlackRock alert draft.
3. Make the rehearsed edits:
   - On the canvas, shorten the headline to **Kirkland Advises BlackRock Funds on Strategic Data Center Venture with Meta**.
   - In the summary, change the final phrase from **long-term growth** to **long-term infrastructure growth**.
   - Edit the article-body datasource in context; change the first section heading from **A framework built for scale** to **A framework designed for scale**.
   - Select the shared **Explore More Insights** CTA Banner and change **View all news and insights** to **Explore all news and insights**. Explain that this is governed shared content and that the approved change will appear anywhere the same datasource is used.
   - In the page Content panel, show the configured **Allan Kirk** author, **Digital Infrastructure** topic, **Mergers & Acquisitions** practice, **Houston** office, and related-insight selectors. Reference-derived links are managed in these fields, not by editing their rendered anchor text on the canvas.
4. Demonstrate the component guardrails in the empty **Article CTA Slot** below the approved article content:
   - Open the component picker, and point out that the slot offers **CTA Banner** but excludes unrelated components such as Rich Text.
   - Drag **CTA Banner** into the slot, and select the existing shared **Find the Right Team for Your Matter** datasource.
   - Show the rendered CTA in context, and then use **Undo** to restore the approved article layout.
5. Show the responsive preview at 1024 px desktop width, tablet width, and phone width. Check headline wrapping, metadata alignment, the related-insights panel, body margins, and CTA spacing.
6. Save the draft. Do not approve or publish during this loop.

**Value statement:** Authors make changes in context while approved components, governed page-level and shared datasources, and placement rules keep the experience on brand.

## Loop 3 — reference fields and reuse

1. Open the alert in Content mode or Explorer, and expand the actual reference fields.
2. Select the configured records:
   - `author`: **Allan Kirk**
   - `relatedPractice`: **Mergers & Acquisitions**
   - `relatedOffice`: **Houston**
   - `relatedInsights`: **UK National Security and Investment Act Update**
3. Return to Page Builder, and show those records rendered in context. Follow the Mergers & Acquisitions link or the related-insight link to prove that it is a configured destination.
4. Select **Deal Announcement**, and show **Used in x places**. Read the count displayed by Sitecore; do not promise a fixed count because it changes as records are added.
5. Open **PAI Partners Pasubio Refinancing** as a second configured destination that uses the same Deal Announcement item.

**Value statement:** Reusable, governed references reduce duplicate data entry and make every configured destination easier to maintain.

## Loop 4 — versioning, review, and deliberate publishing

1. In Content Editor, open **Versions**, and compare the current Draft with the prior approved version. Compare fields in Content Editor, not an old-version Page Builder preview, and compare the page-level article-body and shared CTA datasource versions as well.
2. Show the configured required-field validation on `author`, `relatedPractice`, and `relatedOffice`. `relatedInsights` is optional. If demonstrating an error, briefly clear one required reference, show the validation result, restore the approved value, and save.
3. As the Author, execute **Submit** on the alert and each changed datasource, including the page-level **Article Body** and the site-level shared **Explore More Insights** CTA:

   `Draft → Awaiting Approval`

   Add a specific review comment to each submitted item.

4. Switch to the verified Reviewer session. Show that **Approve** and **Reject** are the configured decisions:
   - `Awaiting Approval → Approved` through **Approve**
   - `Awaiting Approval → Draft` through **Reject**

   Use **Approve** as the short primary path on the alert and every changed datasource, and show the recorded comment or workflow-history entry. If time permits, demonstrate Reject on the alert, correct and resubmit it as the Author, and then approve it in the Reviewer session.

5. Return as the Publisher. Show that the approved workflow state has not automatically published the alert: **Publish** remains a distinct, deliberate action.
6. Publish only the configured dependency set:
   - Allan Kirk
   - Mergers & Acquisitions
   - Houston
   - Deal Announcement
   - Digital Infrastructure
   - UK National Security and Investment Act Update, Mark Gardner, Antitrust and Competition, London, its topic, and its page-level article content
   - PAI Partners Pasubio Refinancing, Cedric Van den Borren, Capital Markets, its topic, and its page-level article content if it is used for the shared-record demonstration
   - the BlackRock alert and its page-level article content
   - the shared Explore More Insights CTA once, rather than a separate copy beneath each article
7. Reopen the clean public session, refresh the alert, and verify the approved headline, summary, links, metadata, and related insights.

**Value statement:** Version comparison, required fields, independent review, and deliberate publishing create an auditable checkpoint before legal content reaches the public experience.

## Reset for the next rehearsal

After publishing the current draft, do not try to move an approved version backward in workflow. Create a new Draft version of the alert, Article Body, and CTA datasource. Restore the rehearsed starting copy, leave the prior approved version published, verify the relationship fields, and repeat the readiness gates.

## Workflow and presenter guardrails

The configured workflow is **Kirkland Editorial Workflow**:

`Draft → Submit → Awaiting Approval → Approve → Approved`

`Awaiting Approval → Reject → Draft`

Approval and publishing are separate. Do not say that approval automatically publishes, and do not publish the entire Kirkland site to complete this loop. If a required account, command, history entry, page-branch option, or rendered reference is missing during rehearsal, treat that as a readiness failure instead of narrating around it.
