# Accessibility Checklist (WCAG 2.2 AA - Applied)

## What was implemented

- Added a **Screen Reader Mode toggle** on the Login page with Arabic/English label:
  - Keyboard accessible button.
  - Uses `aria-pressed` to expose state.
  - Persists in `localStorage`.
  - Announces state changes through toast + aria-live.
- Added global `AccessibilityService`:
  - API: `initialize()`, `enable()`, `disable()`, `toggle()`, `isEnabled()`.
  - Stores and restores state from `localStorage`.
  - Applies global `sr-mode` class on `<body>`.
- Added global `AnnouncerService`:
  - Uses Angular CDK `LiveAnnouncer`.
  - Exposes polite/assertive announcements for SR users.
- Added **Skip to content** link in `AppComponent` as first focusable element.
- Added global `aria-live` regions (polite + assertive) in `AppComponent`.
- Added route-change handling:
  - Focuses main heading (or fallback main region).
  - Announces current page title to screen readers.
- Improved semantics and keyboard behavior in shared layout:
  - Added landmarks (`header`, `nav`, `main`, `footer`) in guest/admin layouts.
  - Replaced click-only anchors with semantic buttons where needed.
  - Added labels for icon/menu triggers.
- Improved login form accessibility:
  - Added hidden `h1` page heading.
  - Error summary with `role="alert"` and assertive announcement.
  - On submit failure, focus moves to the first invalid input.
  - Inputs keep `aria-invalid` and `aria-describedby` linkage.
- Added reusable global accessibility utilities:
  - `.sr-only` helper class.
  - Visible `:focus-visible` outline.

## How to test with NVDA

1. Start the app and open `/login`.
2. Press `Tab` from the top:
   - Confirm the **Skip to content** link is the first focus target.
3. Continue tabbing:
   - Confirm **Screen Reader Mode** toggle is reachable and toggles with `Enter`/`Space`.
   - Confirm NVDA announces pressed/not pressed status.
4. Refresh page:
   - Confirm toggle state persists.
5. Submit empty login form:
   - Confirm NVDA announces error summary.
   - Confirm focus moves to first invalid field.
6. Navigate to dashboard/main pages:
   - Confirm landmarks are announced (`header`, `navigation`, `main`, `footer`).
   - Confirm route change announces page title.
7. Check icon-only controls:
   - Confirm NVDA reads meaningful labels (no unlabeled button output).

## Notes

- No font size changes were made.
- No major layout redesign was introduced.
- Existing functionality is preserved while improving accessibility behavior.
