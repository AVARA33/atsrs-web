# Product Updates plan vibration — V6036

- Scope: Personal plan card attention animation only.
- Removed: diagonal shine overlay (`::after` is disabled).
- Timing: vibration begins 4 seconds after each plan card is rendered.
- Duration: 2 seconds, then the card returns to its exact resting position.
- Motion: subtle horizontal movement with a maximum 1.25px offset and 0.06deg rotation.
- Accessibility: vibration is not scheduled when `prefers-reduced-motion: reduce` is active.
- Unchanged: 10-second plan rotation, 0.9-second diagonal card transition, card layout, copy, colours and navigation.
- Verification: focused Node test, Cloudflare build, browser timing samples and pseudo-element computed styles passed.
