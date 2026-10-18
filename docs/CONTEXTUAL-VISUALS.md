# Contextual diagrams and guided visual study

Relevant chat explanations now offer one optional **Explore this visually** button. It appears after a direct explanation or the guided comparison stage, not before a learner’s initial attempt. The button opens the existing secondary visual panel with the relevant authored activity selected. More options → Explore visually remains available. No extra AI request, image service, external image, iframe, model-provided URL or learner-data upload is used for matching/rendering.

## Supported connections

| Explanation | Diagram and guided next step |
| --- | --- |
| Cell membrane / osmosis | New labelled phospholipid-bilayer/channel cross-section → predict/observe/explain a permeant-solute diffusion example |
| Animal cell, nucleus, mitochondria, cytoplasm | Existing labelled animal-cell schematic, relevant structure selected → membrane close-up |
| Water, carbon dioxide, methane | Matching molecule selected → atom-counting example using hydrogen/oxygen/water |
| General Chemistry molecules | Clearly labelled simple-molecule examples; not a custom diagram of an unsupported molecule |
| Atom conservation / balancing | Existing atom-balance prediction model |
| Enzyme experiment / temperature activity | New sample-tube, bath and temperature-probe diagram → existing enzyme-temperature prediction model |

Plant-cell/wall requests do not receive an animal-cell diagram as if it were a plant cell. Unsupported apparatus, molecules and topics keep ordinary chat; the existing visual library is still available separately. Matching is bounded local English phrase matching, not a comprehensive semantic classifier or automatic scientific image generator. The learner’s question takes priority over incidental terms in the explanation.

## Accuracy and reasoning boundaries

The membrane drawing shows hydrophilic heads facing fluid on both sides, inward-facing hydrophobic tails and one membrane-spanning channel protein. It omits cholesterol, carbohydrates and other proteins. The diffusion activity concerns a selected permeant **solute**, not osmosis/water, active transport or every substance crossing a real membrane. Molecule drawings show connectivity, not physical sizes or 3D angles; methane is explicitly described as tetrahedral. The atom model is a separate water-formation example, not a methane reaction simulation.

The enzyme diagram labels variables/measurement at a conceptual level, without quantities, preparation, heating instructions or a practical procedure. The paired model uses chosen illustrative activity values for a fictional enzyme; it is not experimental evidence or a universal optimum. Real laboratory work requires teacher-approved planning and qualified supervision.

Original diagrams were checked against OpenStax Biology 2e [membrane structure](https://openstax.org/books/biology-2e/pages/5-1-components-and-structure) and [enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes). These are reference checks, not independent subject-teacher approval. Existing molecule/model references remain in VISUAL-MODELS.md and the panel.

Each paired model still gates results behind a prediction, then requires an observation and a learner explanation/limitation before showing its model explanation. Notes remain in browser memory; closing or changing activity preserves simulation notes, while new chat/context/refresh/sign-out clears them. Contextual reopening restores the requested molecule/structure without discarding simulation notes. Controls retain teacher pause rules; visuals and their contextual buttons are removed during the independent check. Closing returns keyboard focus to the contextual button, or More options for a manual launch.

## Verification

51 backend tests and eight frontend suites pass, with build/type checking/lint. Added tests cover relevant/irrelevant routes, question priority, plant-cell exclusions, matching molecule/structure, labels and accessible SVG title/description/captions, plus absence of external image/iframe/script elements. Existing model conservation, prediction/observation/explanation gates and teacher/privacy tests remain in place.

Browser tests used real AI cell-membrane, methane and enzyme explanations to open all three contextual routes. Membrane guided study completed prediction → output → observation → explanation; close/reopen retained notes and returned focus. The methane link selected methane and led to atom prediction; the enzyme link opened the apparatus/variables diagram and gated its model at prediction. An authored guided lesson confirmed that visual support is absent before the reasoning/comparison stage and is removed during independent work. Final 320px checks confirmed panel/page reflow without horizontal overflow after layout settled; the default viewport was restored. A final authored osmosis comparison opened the membrane schematic without an AI call.

These changes do not resolve the separately identified release-hardening items: legacy tracked data/index review, hosting/privacy/account operations, provider/classroom capacity, real-user accessibility/device testing and teacher curriculum review. Nothing merged or deployed.
