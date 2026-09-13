# CV-SV UI validation

**Date:** 2026-09-13  
**Extension:** `pi-web-ui-vision`  
**Target:** `cv-sv` production output at `http://127.0.0.1:3011`  
**Browser:** Brave, launched headlessly through `playwright-core`

## Scope and method

This validates the extension's registered tool definitions directly: the extension was loaded into a minimal `ExtensionAPI` harness, then its actual `execute()` handlers controlled a real browser page. The target server was started from `cv-sv/.output/server/index.mjs` on port 3011, so no CV-SV source, document, or persistent editor content was changed.

The normal development server already listening on port 3000 was also inspected, but could not be used: it returned HTTP 500 with `ENOENT: no such file or directory, mkdir '/Users/handlerone/Downloads/cv-sv/.nuxt/dev'`.

## Working

| Area | Result | Evidence |
|---|---|---|
| Extension load | Pass | All four tools registered: `web_ui_pages`, `web_ui_open`, `web_ui_observe`, and `web_ui_act`. |
| Browser launch and initial navigation | Pass | `web_ui_observe` launched Brave and loaded `http://127.0.0.1:3011/`. |
| Vision payload | Pass | `web_ui_observe` returned both a text snapshot and a native `image/png` / `image/jpeg` content item. |
| CV UI observation | Pass | The page title was `Trần Hà Tuấn Kiệt — CV`; observation found 27 visible interactive elements, including document-sidebar toggle, Markdown formatting controls, theme selector, Split, PNG/JPEG/PDF export buttons, editor tabs, zoom controls, and visible CV links. |
| Element references | Pass | Snapshot references resolved correctly. `e7` activated the visible **Split** button and `e6` selected the **latte** theme. A follow-up observation reported `value="latte"`. |
| Post-action observation | Pass | A new observation after each change supplied a fresh, usable element map and screenshot. |
| Tab management | Pass | `web_ui_pages` created `/about` as `p2`, selected `p1`, and closed `p2`. |
| URL restriction | Pass | `web_ui_open` rejected `file:///etc/passwd`; only `http:`, `https:`, and `about:blank` are accepted. |
| Static type check | Pass | `npm run check` completed successfully. |

## Not working / limitations

| Area | Finding | Impact / follow-up |
|---|---|---|
| CV-SV dev server on port 3000 | Failed before UI testing: HTTP 500 due to missing `.nuxt/dev` directory while two stale Nuxt dev process trees were present. | This is a target-runtime issue, not caused by this extension. Restart the CV-SV dev server cleanly before using port 3000. The production output on port 3011 worked. |
| Viewport scrolling | `web_ui_act({ action: "scroll", delta_y: 500 })` completed, but the observed window scroll position remained `0,0`. | The CV editor uses an internal editor/preview scroller rather than a scrollable document window. The current scroll action targets the viewport only; it cannot target a specific scroll container. Use keyboard navigation or add a container-targeted scroll option if needed. |
| Semantic text lookup for absent controls | A test click on exact text `Preview` timed out because the current CV UI has no visible control with that exact name. | Expected locator behavior; use `web_ui_observe` and an element ref before acting. |
| Visual interpretation by a model | The extension successfully emits screenshot image content, but this validation did not invoke a vision-capable model to judge the pixels. | Confirm model-side visual reasoning separately with a configured vision model. |
| Real user-browser attachment | Not tested. | The extension-owned browser path was tested. Test `PI_WEB_UI_CDP_URL` separately against a dedicated, loopback-only Chrome profile before using an authenticated existing browser. |

## Fixes made during validation

1. Excluded 1×1 hidden status elements from the interactive-element map; the CV UI map now begins with a visible button.
2. Corrected `web_ui_pages new` for extension-owned browsers. New tabs now use `browser.newPage()`, avoiding Chromium's non-creatable default context.

## Reproduction

```bash
cd /Users/handlerone/Downloads/cv-sv
PORT=3011 HOST=127.0.0.1 node .output/server/index.mjs

cd /Users/handlerone/Downloads/pi-web-ui-vision
PI_WEB_UI_URL=http://127.0.0.1:3011 PI_WEB_UI_HEADLESS=true \
  pi -e /Users/handlerone/Downloads/pi-web-ui-vision
```

Then use `web_ui_observe`, act on an observed reference, and observe again.
