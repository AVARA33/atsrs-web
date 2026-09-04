# Paired video editions

The homepage contains paired dark/light editions of workspace, jobs, directory, storage, workflow and dashboard videos. Dark masters remain unchanged. Light versions re-render the original Python scene definitions with a light palette; embedded ATSRS captures retain their original layout and text and receive a local luminance/chroma remap. These are themed historical captures, not fresh recordings of the current live UI. Employer website shots remain unchanged. The light branding asset is the existing light lockup. No global playback filter is used.

Original production sources: C:/Users/user/Documents/GitHub/output/atsrs-marketing/{services-v2,job-journey-v1,catalogue-christopher}/build.py
Paired renderer, export verification: C:/Users/user/Documents/GitHub/output/atsrs-marketing/dual-theme/
Desktop deliveries: C:/Users/user/Desktop/ATSRS Cinema/Dark and Light - Homepage/

The renderer copies each original AAC audio stream and verifies the audio packet hash and video frame count for every pair. UI theme changes select the corresponding MP4 and poster. A playing video restores its position after the alternate source loads; controls, volume and captions/content stay on the same element.

Future production must output both themes from one source timeline. The repository AGENTS.md and marketing production AGENTS.md record this requirement.

Light revision 2 uses the site blue #167bd3 for brand buttons, graphics and UI labels, navy #0b2554 for main text and #536680 for secondary text. Semantic expiry/success status colours and external employer buttons are retained. Light asset URLs carry ?v=2 to bypass cached first-edition green files.

Light revision 3 follows the owner correction: every green element, including dashboard status icons, is blue. A final green-dominant pixel remap is applied at source render time; this is baked into the light MP4 only. Light URLs use ?v=3.
