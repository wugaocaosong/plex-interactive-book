# Active ebook working copy

Use this `book` directory as the active project. Do not edit an old extracted copy on E: in place of this working copy.

## Upstream integration status

The active upstream selected by the user is `wugaocaosong/plex-interactive-book`, branch `main`. The user authorized merging all current local effects and the prior `bingsober/qa-board` effects into the latest main and pushing the result. On 2026-11-17 access succeeded: main baseline `d3e923bf24a47a7fb090ec913b863df2bb6ea360`; QA baseline `9de081aa9ec46ae66c88b3ebe476c729d93f44ec`.

Preserve upstream star-directory, reader, voice/camera, and chapter features alongside our mixed quizzes, glossary and QA fixes. Use the integrated main for future changes; inspect upstream before pushing and never force-push over others' work. The unrelated link-edu repository is not a target. Older work is preserved in local backup branches and fork commit `eb8f1dc8da929046629e621bf60fd20eb0a09503`.

Publication status: integration is validated locally (42 Node tests, TypeScript, production build and browser checks of quizzes, QA, glossary and stellar directory). GitHub create-tree publication was rejected with HTTP 403 "Resource not accessible by integration". The repository is public/readable, but the connection installation inventory only lists bingsober. No primary push succeeded. Local main contains the integrated source and must not be overwritten by pulling the older remote. When write access becomes available, fetch main again, reconcile any new changes and push without force.

## Features to preserve when merging

- 64 chapter tests, four per chapter (chapters 1–16), with five interaction types across the book; no tests in preface or contents.
- Immediate feedback, explanations, draft/progress persistence, and safe migration of the unchanged first legacy question.
- 150 unified glossary definitions, dashed term marks and a common explanation dialog; earlier term definitions are retained, and every explicit label in the latest content resolves (100 labels at integration).
- QA layout fixes, local draft/nickname persistence, reply/like/state updates and filters; this remains browser-local storage, not a shared server board.
- Existing chapter-specific material and the original 118 source pages.

## Validation and preview

Run `npm run typecheck`, `node --test tests/*.test.mjs`, and `npm run build`. Do not run typecheck concurrently with a build that deletes the output directory. Regenerate authored quiz/glossary assets using their preparation scripts when their sources change.

The user-facing local preview address is `http://127.0.0.1:5192/`; its stable launch entry is `OPEN_BOOK.cmd` (and `../打开电子书.cmd`). A temporary preview server started in a tool session may stop when the session ends. Never promise that a localhost link is a permanently hosted website.

## Reader effect restoration (2026-11-17)

Inline lab correction: the user explicitly wants the authored `.lab-editor` embedded editor (dark editable code area, run/stop/reset/full-program controls and output below), not the `.route-lab-card` preview plus floating editor introduced during integration. Preserve these cards in `route_lab.pages()`. Restored lab.css, added delegated inline worker/draft runtime and hydrated final page leaves. The worker can optionally echo a final expression for notebook-like calls such as `dispatch_plan()`. Typecheck, two runtime regression tests, four algorithm tests, execution of six basic Python snippets, audits and production build passed. Browser rendering has not been verified in this session.

Follow-up: normalized chapter index routes to `/read/<chapter>/` in manifest, page metadata, internal links and import generator; static server also accepts legacy `/index` URLs. Added comprehensive lab buttons to chapters 9–11 end-of-chapter quiz cards. Typecheck, 10 focused Node tests, content/learning audit, production build and filesystem verification of all 149 built routes plus directory passed. Interactive verification remains incomplete: this session's localhost requests fail with EACCES, CUA browser session lookup fails, and open_in_codex fails. Do not claim the preview server is stopped based on EACCES or that directory/turning/lab interactions were browser-verified. Remote push remains unresolved.

The first integration omitted the preserved branch glossary hover implementation and 610 lines of authored learning.css, and replaced its three-column settings with a basic form. Restored these from work/local-preserved-20261117, including font/immersion bindings, full term explanations, settings reset and mode selection. QA component matches the preserved branch and is mounted in the navigation dialog. Verified actual browser hover tooltip, full settings controls and QA board after rebuilding. Typecheck, 9 targeted tests, content audit and production build passed. Do not claim all historical effects have been verified merely because the book loads. Remote publication remains blocked by GitHub connector HTTP 403.
