# Kirkland alert demo runbook

Use the configured **BlackRock Meta Data Center Venture** alert for all four loops. Keeping one record throughout makes the relationship, authoring, workflow, and publishing story easy to follow.

## Readiness gates

- Deploy the Kirkland editing host before the rehearsal, and verify the alert in Page Builder at the default 1024 px desktop width, tablet width, and phone width.
- Pull the `Kirkland.Demo` and `kirkland-page-branches` serialization modules after connecting the Sitecore CLI. The module files define intentionally narrow boundaries; they do not replace a serialization pull and do not contain fabricated item YAML.
- Publish the site-level `Presentation/Page Branches` rule item and the configured **News Article** branch. Confirm that **News Article** is the creation option under **News and Insights**.
- Keep version 1 of the alert approved and published. Keep version 2, its article-body datasource version 2, and any page-level datasource that will be edited in **Draft** until the authoring loop.
- In Content Editor, confirm that the Required validator is visible for Practice, Office, and Source material, and that Submit and Approve are blocked while any one of those fields is empty.
- Verify the named Author, Reviewer, and Publisher accounts before the demo. The Reviewer must be able to execute the configured Approve and Reject commands, and the Publisher must have explicit publish rights.
- Use a real reviewer session. If role switching is not practical, prepare a verified screenshot from that session; never imply that an unverified or simulated account is live.

## Configured records

| Purpose          | Configured item                                                                  |
| ---------------- | -------------------------------------------------------------------------------- |
| Alert            | BlackRock Meta Data Center Venture                                               |
| Author           | Kirkland and Ellis LLP                                                           |
| Practice         | Private Equity                                                                   |
| Office           | New York                                                                         |
| Content type     | Deal Announcement                                                                |
| Topic            | Digital Infrastructure                                                           |
| Source           | Meta and BlackRock transaction announcement                                      |
| Related insights | PAI Partners Pasubio Refinancing; UK National Security and Investment Act Update |
| Language         | English                                                                          |

The relationship fields on the alert are `taxAuthor`, `relatedPractice`, `relatedOffice`, `sourceItem`, and `relatedInsights`.

## Loop 1 — public experience

1. Open `/News-and-Insights/BlackRock-Meta-Data-Center-Venture` in a clean browser session.
2. Point out the headline, summary, firm author, **Private Equity** practice, **New York** office, source material, related insights, content type, topic, and English-language context.
3. Open the source material in a new tab, and then follow the **Private Equity** link to its configured practice page.
4. Use this sentence exactly:

   > SitecoreAI links approved content records that Kirkland has configured.

5. Describe only authored and approved record links. Do not describe inferred relationships between people, inferred interests, visitor behavior, or recommendations based on behavior.

**Value statement:** Kirkland controls the approved records and relationships; the public experience renders those trusted connections consistently.

## Loop 2 — Page Builder authoring checkpoint

1. Sign in as the Author, and open the Kirkland site and the alert in Page Builder.
2. Show the configured and published **News Article** page branch as the pattern for new alerts, then continue with the existing BlackRock alert version 2.
3. Make the rehearsed edits:
   - On the canvas, shorten the headline to **Kirkland Advises BlackRock Funds on Strategic Data Center Venture with Meta**.
   - In the summary, change the final phrase from **long-term growth** to **long-term infrastructure growth**.
   - Edit the article-body datasource in context; change the first section heading from **A framework built for scale** to **A framework designed for scale**.
   - In the CTA Banner’s content fields, change **View all News & Insights** to **Explore all News & Insights**.
   - In the page Content panel, show the configured **Digital Infrastructure** topic, **Private Equity** practice, **New York** office, source, and related-insight selectors. Reference-derived links are managed in these fields, not by editing their rendered anchor text on the canvas.
4. Demonstrate the component guardrails by moving the existing CTA Banner above the article body, showing the changed order, and then using **Undo** to restore the approved Header → Body → CTA sequence.
5. Show the responsive preview at 1024 px desktop width, tablet width, and phone width. Check headline wrapping, metadata alignment, source and related-insight cards, body margins, and CTA spacing.
6. Save the draft. Do not approve or publish during this loop.

**Value statement:** Authors make changes in context while approved components, page-level datasources, and placement rules keep the experience on brand.

## Loop 3 — reference fields and reuse

1. Open the alert in Content mode or Explorer, and expand the actual reference fields.
2. Select the configured records:
   - `taxAuthor`: **Kirkland and Ellis LLP**
   - `relatedPractice`: **Private Equity**
   - `relatedOffice`: **New York**
   - `sourceItem`: **Meta and BlackRock transaction announcement**
   - `relatedInsights`: **PAI Partners Pasubio Refinancing** and **UK National Security and Investment Act Update**
3. Return to Page Builder, and show those records rendered in context. Follow the Private Equity link or one related-insight link to prove that it is a configured destination.
4. Select **Kirkland and Ellis LLP**, and show **Used in x places**. Read the count displayed by Sitecore; do not promise a fixed count because it changes as records are added.
5. Open **PAI Partners Pasubio Refinancing** as the second configured destination that uses the same firm-author item.

**Value statement:** Reusable, governed references reduce duplicate data entry and make every configured destination easier to maintain.

## Loop 4 — versioning, review, and deliberate publishing

1. In Content Editor, open **Versions**, and compare current Draft version 2 with prior approved version 1. Compare fields in Content Editor, not a version-1 Page Builder preview, and compare the article-body and CTA datasource versions as well.
2. Show the configured required-field validation on `relatedPractice`, `relatedOffice`, and `sourceItem`. `relatedInsights` is optional. If demonstrating an error, briefly clear one required reference, show the validation result, restore the approved value, and save.
3. As the Author, execute **Submit** on the alert and each changed page-level datasource, including **Article Body** and **Explore More Insights**:

   `Draft → Awaiting Approval`

   Add a specific review comment to each submitted item.

4. Switch to the verified Reviewer session. Show that **Approve** and **Reject** are the configured decisions:
   - `Awaiting Approval → Approved` through **Approve**
   - `Awaiting Approval → Draft` through **Reject**

   Use **Approve** as the short primary path on the alert and every changed datasource, and show the recorded comment or workflow-history entry. If time permits, demonstrate Reject on the alert, correct and resubmit it as the Author, and then approve it in the Reviewer session.

5. Return as the Publisher. Show that the approved workflow state has not automatically published the alert: **Publish** remains a distinct, deliberate action.
6. Publish only the configured dependency set:
   - Kirkland and Ellis LLP
   - Private Equity
   - New York
   - Meta and BlackRock transaction announcement
   - Deal Announcement
   - Digital Infrastructure
   - both related insights and their page-level datasources
   - the BlackRock alert and its page-level datasources
7. Reopen the clean public session, refresh the alert, and verify the approved headline, summary, links, metadata, source, and related insights.

**Value statement:** Version comparison, required fields, independent review, and deliberate publishing create an auditable checkpoint before legal content reaches the public experience.

## Reset for the next rehearsal

After publishing the current draft, do not try to move an approved version backward in workflow. Create a new Draft version of the alert, Article Body, and CTA datasource. Restore the rehearsed starting copy, leave the prior approved version published, verify the relationship fields, and repeat the readiness gates. Update the version numbers in this runbook if the baseline is no longer version 1 versus version 2.

## Workflow and presenter guardrails

The configured workflow is **Kirkland Editorial Workflow**:

`Draft → Submit → Awaiting Approval → Approve → Approved`

`Awaiting Approval → Reject → Draft`

Approval and publishing are separate. Do not say that approval automatically publishes, and do not publish the entire Kirkland site to complete this loop. If a required account, command, history entry, page-branch option, or rendered reference is missing during rehearsal, treat that as a readiness failure instead of narrating around it.
