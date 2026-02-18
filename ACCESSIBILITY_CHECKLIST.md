# Accessibility Checklist (WCAG 2.2 AA - Practical Implementation)

## What was implemented

- **Global Screen Reader/Blind Mode**
  - Added `AccessibilityService` with `BehaviorSubject<boolean>`.
  - Added API methods: `enable()`, `disable()`, `toggle()`, `isEnabled()`.
  - Persisted mode to `localStorage` key: `screenReaderMode`.
  - Applies global class on `<body>`: `sr-mode`.

- **Login Page: Blind Mode Toggle**
  - Added bilingual toggle button: **"وضع المكفوفين / Screen Reader Mode"**.
  - Keyboard accessible by default (`button` supports Tab + Enter/Space).
  - Includes switch semantics (`role="switch"` + `aria-checked`).
  - Shows visible snackbar confirmation and also announces state via live announcer.

- **Skip Link + Main Focus**
  - Added "Skip to content" link in `AppComponent` as first focusable element.
  - Skip activation moves focus to main content container.

- **Global Live Regions + Announcements**
  - Added app-level polite and assertive `aria-live` regions.
  - Added `AnnouncerService` using Angular CDK `LiveAnnouncer`.
  - Announces route changes and focuses page heading (fallback to main region).

- **Landmarks and semantic structure**
  - Added/improved use of `header`, `nav`, `main`, and `footer` landmarks in root layouts.
  - Added `h1` heading on the login page.

- **Form accessibility on login**
  - Existing labels and error links preserved/improved.
  - On invalid submit, focus moves to first invalid field.
  - Error summary is announced in assertive live region.

- **Keyboard and icon button hygiene**
  - Replaced click-only `javascript:` links in key screens with semantic button/link usage.
  - Added/kept `aria-label` on icon-only controls where touched.
  - Added clear visible focus outline in SR mode.

## How to test with NVDA (quick checklist)

1. Open login page and press `Tab`.
   - Verify first focus stops at **Skip to content**.
2. Tab to **وضع المكفوفين / Screen Reader Mode** and press `Space`.
   - Verify visual snackbar appears.
   - Verify NVDA announces enabled/disabled message.
3. Refresh page.
   - Verify mode remains persisted and active.
4. On login form, submit empty form.
   - Verify NVDA announces error summary.
   - Verify focus moves to first invalid input.
5. Navigate to another route after login.
   - Verify page title announcement.
   - Verify focus moves to page heading (or main region fallback).
6. Test full keyboard-only navigation on Login + main layout pages.
   - Confirm no click-only dead-ends.

## Notes

- No font-size changes were made.
- No drastic UI redesign was introduced.
- Changes were focused on accessibility semantics, focus handling, and announcements.
