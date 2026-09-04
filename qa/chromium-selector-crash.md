# Chrome / Opera selector crash investigation — 4 September 2026

## Confirmed evidence

- Latest five Chrome dumps from 05:20–05:26 Baku: 0xc0000005, chrome.dll 152.0.7977.83, RVA 0x3a3d612.
- Opera GX dumps from 05:22–05:28 and 28–29 August: 0xc0000005, opera_browser.dll 134.0.5954.67, RVA 0x452b18e.
- Both fault sites have the same instruction sequence, starting `movsxd rax,dword ptr [rax+0x30]`.
- Downloaded Google's exact public Chrome PDB (EA0AD9C796DD48224C4C44205044422E1). Public symbols place the Chrome fault in `blink::SelectorChecker::MatchSelector`, +0x7c2 from function entry. DBI section contribution maps to selector_checker.obj. C13 source mapping places it under selector_checker.cc line 887 (`CheckOne`, inlined).
- Stack-memory return addresses include MatchSelector and SelectorQuery::Matches; later addresses enter V8 callbacks and ArrayForEach. This identifies the native selector-matching path invoked by JavaScript. The stack-memory scan is not a complete symbolic unwind of JavaScript frames.
- Only exception/module/stack code-address metadata was inspected. No crash dump or user content was uploaded. The downloaded symbols are Google's public debugging data.

## Site workaround

Replace ATSRS's direct Element.matches calls with equivalent localName, attribute, classList and activeElement checks. These were used in repeated form decoration, native-select/date upgrades, focus checks and checkbox checks. Do not patch browser prototypes, remove styling, disable authentication or modify browser settings. Retain existing selectors used by querySelector/closest and all normal field behaviour.

This removes a plausible application trigger of the identified native crash path. It does not prove which particular selector or JavaScript call originally triggered the invalid memory access. A browser/engine defect or other contributor may still exist; absence of a crash in a short test is not proof of permanent remediation.

## Validation

- Six Node regression tests pass (field classification, labels, removed direct matches calls, and prior cross-browser notification receipt behaviours).
- Syntax checks pass for all six changed scripts.
- Real Chrome field fixture passes: zero idle mutations, disabled state, dynamic added field, theme surface and settled observer state.
- Existing field values and native control semantics are retained. Asset versions and lazy jobs loader are updated together.

Source reference: https://chromium.googlesource.com/chromium/src/+/refs/tags/152.0.7977.83/third_party/blink/renderer/core/css/selector_checker.cc

## Follow-up: 2026-09-04 05:40 Baku

The owner reproduced a Chrome crash after repeated reloads; Opera did not crash in that test. The new local Chrome dump reports 0xc0000005 in 152.0.7977.83 at RVA 0x3a30453. The same exact public PDB resolves this to v8::internal::Factory::JSFunctionBuilder::Build + 0x323, with factory.cc line 5377. This is a different fault location from SelectorChecker::MatchSelector. Stack-memory candidates include Runtime_NewClosure_Tenured, ArrayForEach and promise/microtask handling; they do not identify the responsible JavaScript file. A stack-memory scan is not a reliable full unwind.

Six subsequent reloads through the connected Chrome tab returned the ATSRS jobs heading successfully. This bounded check does not negate the user's reproduction. The earlier selector change is a mitigation, not a confirmed resolution of all crashes. The underlying memory failure remains unresolved; no extension, hardware, server or individual site script has been established as the root cause. No additional speculative changes to the JavaScript engine, security settings or browser extensions were made.

The separate notification badge flash is explained by rendering pending requests before their server read receipts arrive. The follow-up patch waits for per-request receipt hydration, displays a loading/error state instead of assuming unread, and re-runs a sync requested while an earlier sync is in flight. Confirmed read receipts remain server-backed and scoped to the authenticated account.
