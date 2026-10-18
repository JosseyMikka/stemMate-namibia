# Learner subject colours

Grades 10–12 keep the familiar navy sidebar and light conversation area. Subject colour is limited to a labelled badge, the small chat emblem and a thin header accent. Primary actions, reasoning states and scientific diagrams do not inherit subject colours. No new navigation or data collection is introduced.

| Subject | Text/accent | Light badge background |
| --- | --- | --- |
| Mathematics | #1e4f91 blue | #eaf2fc |
| Physics | #66389b purple | #f3edfc |
| Chemistry | #006d77 teal | #e6f5f5 |
| Biology | #24633a green | #eaf5ed |
| Computing / Computer Science | #984515 orange | #fff0e5 |

Visible names identify every subject; decorative symbols are hidden from assistive technology. Unknown subjects use a neutral STEM badge. The subject accent follows the applied course, not an uncommitted settings selection. Independent and class chats use the same palette. Badges wrap on narrow screens; forced-colour mode uses system colours.

Automated tests require at least 4.5:1 contrast for badge text and white emblem text, and 3:1 for the header accent against the chat background. These checks cover the new accents, not complete WCAG conformance. Existing focus, reduced-motion and reasoning/privacy behaviour remains.

Validation: nine frontend suites, build/typecheck and lint; browser applied all five subjects and checked computed colours, Physics starter → uncertainty → hint, and Computing at a 320px viewport (305px client/scroll width, no horizontal overflow). Desktop viewport restored. No merge/deployment/history rewrite.

## Expanded responsive verification

All five subjects were checked at viewport widths 320, 390 and 1280 pixels in three states: welcome, authored starter after “I’m not sure” and first hint, and expanded More options (45 screen states). Computed badge colours matched the applied subject, and document scroll width did not exceed client width. No new visual defect was found, so no interface change was necessary.

Computing was additionally checked at 390×480: keyboard Enter opened/closed More options, an existing learner draft survived and Send my thinking stayed enabled. At 320px the long Computing / Computer Science label wrapped inside its badge. Desktop viewport was restored. Nine frontend suites, build/typecheck and lint passed again.

These are desktop Chrome viewport checks, not physical iOS/Android or virtual-keyboard tests, and not a full accessibility audit. Both curricula share this subject palette; the responsive matrix used the default Namibia Grade 10 context and authored activities, without making AI-provider calls. No history rewrite, merge or deployment was performed.
