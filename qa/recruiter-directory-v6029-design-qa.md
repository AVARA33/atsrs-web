# Recruiter Directory V6029 — Design QA

## Inputs

- Reference: `C:/Users/user/AppData/Local/Temp/codex-clipboard-b5504ffc-4f30-4bd0-ae2d-24b0f20a1ca6.png`
- Implementation capture: `qa/recruiter-directory-v6029-preview.png`
- Combined comparison: `qa/recruiter-directory-v6029-comparison.png`
- Comparison viewport: 2048 × 815 for both sides

## Visual review

- P0: none.
- P1: none.
- P2: none.
- P3: the isolated QA preview intentionally omits the shared application sidebar and account header; production continues to use the existing shell.
- The hero hierarchy, green orbit artwork, CTA pairing, filter row, security note, two-column recruiter cards, spacing, borders, and dark palette match the supplied reference closely.
- The generic Recruiters page title is suppressed. Recruiter Directory and JobSearch both use a 1440px content rail and an 8px hero top offset, preventing vertical header movement during route changes.
- Search, company, vacancy and sort filters remain wired. Explore all, Active vacancies, LinkedIn, vacancy and share actions remain available.
- Light mode uses the existing ATSRS blue accent while preserving the same geometry.

final result: passed
