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
