# CV Editor

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec covers:

- editor pages `app/pages/index.vue` and `app/pages/e/[id].vue`;
- `app/layouts/editor.vue`;
- `app/components/CodePreview.vue` and `app/components/editor/CodeMirror.vue`;
- `app/composables/useCodeMirror.ts` and the browser-facing parts of `useCvDocument.ts`;
- seed assets in `app/data/reference-cv.{md,css}`;
- themes in `app/assets/theme/themes.css`, `useTheme.ts`, and `theme.client.ts`;
- image export in `app/utils/exportCvImage.ts` and browser print behavior.

Document persistence and synchronization are specified in [cv-documents-realtime.md](cv-documents-realtime.md). Standalone headless PDF automation belongs to [mcp-automation.md](mcp-automation.md).

## Editor Routes And Ownership

`/` opens document `master` with the reference Markdown/CSS as its client fallback. `/e/:id` opens the route parameter as a document id, with generated heading Markdown and the reference CSS as fallback. Both pages disable the default layout and provide source tabs, editor content, and preview content to `app/layouts/editor.vue`.

The editor layout owns the full-window shell, source/preview split, pointer and keyboard resizing, toolbar, activity bar, sidebar placeholders, status bar, responsive behavior, and print-only layout. Pages own active Markdown/CSS tab state and export invocation.

The split starts at 46%. Pointer resizing attempts to retain a minimum pane width; keyboard resizing clamps source width to 30–70%, and double-click resets it. The document sidebar can be collapsed and resized from 160–420px by pointer or keyboard; its open state and width persist in local storage. At widths below 900px the document sidebar is hidden; below 760px the preview and divider are hidden.

## Source Editing

`EditorCodeMirror` is a controlled `v-model` wrapper over `useCodeMirror()`. The composable owns the editor lifecycle and installs line numbers, history, standard/history keymaps, active-line highlighting, bracket matching, indentation, wrapping, the One Dark theme, and a transparent container theme.

A CodeMirror `Compartment` switches between Markdown and CSS language support without recreating the editor. Markdown enables language data for fenced code and adds larger heading highlighting. External model changes replace the complete CodeMirror document only when the text differs; CodeMirror document changes emit the complete source string back to Vue. In Markdown mode, toolbar commands wrap selections as bold, italic, link, or inline code and prefix selected lines as headings, quotes, or bullet items. Formatting controls are disabled in CSS mode.

## Markdown And CSS Rendering

`CodePreview` runs Markdown synchronously through `remark-parse`, GFM, `remark-rehype`, `rehype-sanitize`, and `rehype-stringify`. The sanitizer uses its default schema plus `className` on `code`. Sanitized HTML is the only value passed to `v-html`.

The document stylesheet is assigned to a `<style>` element through `textContent`, not HTML interpolation. CSS remains intentionally user-controlled and applies in the page document; it should therefore be treated as active presentation input even though it cannot inject markup through this path.

Pagination occurs after Markdown rendering: generated `<hr>` elements split the sanitized HTML into separate `.cv-sheet` articles, and empty segments are discarded. The reference stylesheet sizes sheets as A4 and uses print page breaks between adjacent sheets. Preview controls zoom from 25–200%, reset to 100%, or fit one sheet to the available viewport. Fit mode responds to viewport resizing, the page indicator tracks rendered sheets, and print always renders at 100%.

## Export

The PDF toolbar action calls `window.print()`. Print media rules hide editor chrome and expose the preview sheets; final destination and PDF generation are browser-owned.

PNG/JPEG export calls `exportCvImages()`:

- waits for `document.fonts.ready` when available;
- finds every `.cv-sheet` in the current document;
- lazy-loads `html2canvas` and renders each sheet at 2× scale on white;
- encodes PNG or JPEG at quality `0.95` and triggers one browser download per sheet;
- sanitizes the requested base filename and adds `-page-N` for multiple sheets.

Image export throws if no sheets exist or encoding fails. Remote assets depend on browser canvas/CORS behavior.

## Themes And Accessibility

The application defines Catppuccin Mocha, Catppuccin Latte, and OpenCode token sets. `useTheme()` applies `data-theme` to the root element and stores the id in `localStorage`; the client plugin restores it, defaulting to Mocha.

The editor labels its main regions and icon controls, exposes the divider as a keyboard-focusable separator, and globally reduces animation for `prefers-reduced-motion`. Preview pages receive numbered `aria-label` values.

## Current Gaps

- Split, sidebar create/refresh, help, line/column, word count, and A4 status controls are currently static or emitted without a page-level implementation.
- CSS is not scoped to `.cv-sheet`; a document stylesheet can affect editor chrome or initiate external resource loads.
- Image export has no progress/error UI and creates separate downloads rather than one archive for multi-page CVs.
- There is no visual regression or browser export coverage.
