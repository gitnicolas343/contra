# Frontend Guide

## Files
- HTML: `static/<page>.html`
- CSS: `static/css/<page>.css`
- JS: `static/js/<page>.js`
- Shared styles: `static/css/base.css`, `static/css/auth.css`

## Rules
- No inline `<style>` or inline `<script>` in HTML.
- Keep one CSS and one JS file per page.
- Use the shared classes when possible:
  - Buttons: `.btn-primary`, `.btn-social`, `.btn-purple`
  - Inputs: `.input`, `.input-field`
  - Modals: `.modal`, `.modal-content`, `.modal-close`, `.modal-backdrop`, `.modal-card`
  - Loading: `.loading-card`, `.spinner`, `.loading-title`, `.loading-text`

## HTML template
```html
<link rel="stylesheet" href="/static/css/base.css">
<link rel="stylesheet" href="/static/css/auth.css">
<link rel="stylesheet" href="/static/css/mypage.css">

<main>
  <!-- content -->
</main>

<script src="/static/js/base.js" defer></script>
<script src="/static/js/mypage.js" defer></script>
```

## Icons
- Use inline SVG inside `.social-icon` for OAuth buttons.
- Keep icons monochrome (black) to match the system.

## Modals
- Use `.modal-backdrop` + `.modal-card` for alert/modals.
- Use `.modal` + `.modal-content` for simple overlay modals (like terms).

## Accessibility
- Add `aria-modal`, `role="dialog"`, and focusable buttons in modals.
