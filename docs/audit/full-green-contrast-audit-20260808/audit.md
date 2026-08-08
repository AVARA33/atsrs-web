# ATSRS full light-mode green-control audit

## Scope and method

Combined visual and computed-style audit of every visible signed-in navigation route in Personal and Corporate light mode. Solid or gradient green elements with visible text were checked for both CSS `color` and Chromium `-webkit-text-fill-color`; pale green status surfaces were kept with their readable dark-green text.

## Corporate route results

1. Dashboard - healthy.
2. Personnel - healthy.
3. Candidates - healthy.
4. Documents - needs correction: four sage sort controls use dark labels and arrows.
5. References - healthy.
6. Compliance - healthy.
7. Reports - healthy.
8. Company - healthy.
9. Product Updates - healthy.
10. Privacy - healthy.

## Personal route results

11. Dashboard - healthy.
12. Documents - needs correction: the same four shared sort controls use dark labels and arrows.
13. References & CV - healthy.
14. Profile - healthy.
15. Security - healthy.
16. Privacy & Sharing - healthy.
17. Product Updates - healthy.
18. Privacy - healthy.

## Correction and verification

- V442 explicitly applies white `color` and white `-webkit-text-fill-color` to the four Documents sort labels and their up/down arrows.
- The neutral local fixture confirms all four sort controls render white foregrounds with zero console errors and zero document-level horizontal overflow.
- Regression suite: 51 passed, 0 failed.

## Evidence limits

- The audit covers every visible signed-in top-level route and its rendered content in both workspaces.
- Destructive dialogs and account/authentication flows were not opened. Login, authentication, loading behavior, and production data were not changed.
- Full-page production screenshots were kept temporary to avoid retaining PII; the saved audit images contain only the affected table headers and a neutral corrected fixture.
