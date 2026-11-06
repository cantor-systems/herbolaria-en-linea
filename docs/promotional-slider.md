# Home promotional slider — HERB-WEB-001

The slider is inserted immediately below the global header and before the existing,
unchanged `HeroBanner`. It introduces no commercial service or new dependency.

## Configuration and publication

Edit `src/content/promotional-slides.ts`: identifier, campaign kind, desktop/mobile
images, focal positions, left/right desktop copy position, alt text, eyebrow, headline, CTA, internal destination,
order, active flag and optional ISO 8601 dates with timezone. The start is inclusive;
the end is exclusive. Invalid or inverted dates omit the slide. Home revalidates
every 60 seconds; campaign boundaries therefore have cache/revalidation latency
and are unsuitable for enforcing commercial prices or eligibility.

The owner approved the three current panoramic images for **provisional use in
Production on 2026-11-06**, including their current desktop/mobile presentation,
and authorized the release through PR #22 after successful validation.
All three slides now have `previewOnly: false`: they are included in production
builds and do not display “Preview · Imagen de referencia”. No promotional copy
is embedded in the images. The unbranded bottles remain contextual imagery,
not exact Moronel packaging. The images are provisional, not a claim of final
commercial photography.

The `previewOnly` protection remains available for future unapproved images.
Those slides are included only in Vercel Preview or local `next dev`; production
omits them. If `VERCEL_ENV` is unavailable, unapproved reference slides remain
excluded. Approved slides do not depend on that variable. See the [official
environment reference](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_env).
Production must receive its own build from `main`, rather than promotion of a
Preview artifact built with different content eligibility.

The mockup itself is not shipped. The existing catalogue images and Hero are unchanged.

## Provisional panoramas authorized for Production

The supplied WebP files are copied byte-for-byte into `public/images/banners/`:

| Banner | File | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Featured product | `featured-product.webp` | 2094 × 1174 | 169142 | `05d8905cb2d7818570aabc7cb74c24508c1e9750320020686156537eec2801c8` |
| Packages | `packages.webp` | 2066 × 1126 | 223750 | `906c0dce075c6ddf2c4e5084607af27f39860c0efc9c12405b8bb5d3b65df77b` |
| Editorial | `herbal-editorial.webp` | 2245 × 1035 | 56062 | `3fda6900428ef30113f69d203900c32384a1faaba32b9960221c54c62455880a` |

No image synthesis, retouching, mirroring or text compositing is applied. Copy and
CTAs remain HTML. The featured/editorial photos have their subject on the left,
so their desktop copy and reading gradient move to the right. Packages retains
left-aligned copy. Navigation, dimensions and controls are preserved.

No separate mobile files were supplied. Each photo is reused with an explicit
mobile focal point (left for the dropper, centre for the package scene, left-side
leaves for the editorial image); copy retains the existing bottom placement.
These are reviewed crops of the supplied images, not independent mobile artwork.
Dedicated mobile photography can replace `mobileImage` later without redesigning
the slider. The current mobile crops and contextual unbranded imagery are included
in the owner's provisional Production approval. Future replacements must undergo
their own review and retain `previewOnly: true` until approved.

The packages destination is `/categoria/paquetes-y-promociones`. No percentage,
gift, launch, price or expired coupon is advertised by the new component.

## Interaction and accessibility

Six-second autoplay runs only with multiple slides, visible document, no active
content-hover/focus pause and no reduced-motion preference. Manual navigation
pauses it until the user resumes. Explicit Play acknowledges current interaction
pause reasons while keeping DOM focus on the playback control. New content hover,
focus, pointer interaction or slide navigation pauses it again. Merely focusing
Play from paused content does not resume it. Only mouse pointers create hover
pause; touch compatibility events do not. The playback label/icon reflect actual
rotation, including automatic pauses. Reduced motion and page visibility always
take precedence over Play. This follows the explicit-start principle in the
[WAI carousel example](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/examples/carousel-1-prev-next/).
Arrows, indicators and pause/resume have accessible names and touch
targets of at least 44px. Arrow keys, Home and End work within the region.
Reduced motion disables autoplay. Without JavaScript the first slide, image and
CTA remain available, and interactive controls are omitted. Only the current
image is mounted; the first image has high fetch priority, later images lazy/low.
The fixed responsive viewport prevents layout shifts between headlines.

The original Hero still follows the slider by request. Both invite catalogue
discovery, so the introductory message is intentionally repeated pending a
separate full-Home design decision. No Hero replacement is included.

## Local review

Use `npm run dev -- --hostname 127.0.0.1` in a local environment without production
credentials. `npm test`, `npm run typecheck`, `npm run build` and `git diff --check`
cover the change. The project currently defines no lint command or lint dependency.
Browser review must check desktop/tablet/mobile, focus/keyboard, reduced motion,
autoplay, pause/resume, image requests, no-JS content, stable dimensions, links and
absence of horizontal overflow. Do not exercise checkout or external providers.

## Validation evidence (2026-11-06)

- 27 automated tests passed (7 new slider tests); TypeScript and production build passed.
- Real Chromium, already installed: 1440px desktop, 768px tablet, 390px and 320px mobile.
- Arrows/indicators/keyboard wrapping, six-second autoplay, focus/hover/manual pause,
  reduced motion, stable slide height and three local HTTP 200 CTA destinations passed.
- A browser with JavaScript disabled retained the first banner and CTA.
- Before release approval, a local production build omitted the then-unapproved
  reference slider and retained the original H1.
- No browser runtime errors or attempted external requests in local validation.
- Local server bound to `127.0.0.1`; environment files hidden from Next's loader,
  provider credentials removed, HTTP access restricted by a validation preload,
  and external browser requests blocked. This is not OS-level network isolation.
- Hero/navigation/catalogue/checkout/provider modules and lockfile remain unchanged.

### Panoramic revision

- 27 automated regression tests passed; 12 existing browser checks passed with the new images.
- Six complete Home captures: each of the three banners at 1440px desktop and 390px mobile.
- Actual decoded banner dimensions, local image paths, explicit mobile focal points,
  one visible slide, one H1, contained CTA, separation from controls and no horizontal
  overflow verified for all six captures.
- Source and repository asset hashes match. During this review all three slides
  remained Preview-only; the later release authorization below supersedes that status.

### Production release authorization (2026-11-06)

- The release request approved the three `previewOnly` flags changing to `false`.
  Its validation exposed the playback blocker described below; the subsequent
  correction is separately authorized. Copy, CTA, photos, positions, responsive
  styles and Hero remain unchanged.
- Regression coverage checks both production inclusion of the three approved
  banners and continued exclusion of future unapproved Preview-only imagery.
- Release requires passing tests, typecheck, production build, local production
  browser verification of all three banners without the Preview label, CI, merge
  of PR #22 and a Ready production deployment from that merge.
- Public verification is limited to Home, its static banner resources and slider
  interactions on desktop/mobile, without checkout or other commercial operations.

### Mobile playback correction — merge remains on hold

The owner authorized diagnosis/correction and an update to PR #22, with a new
confirmation required before merge. No Production publication is part of this step.
The three provisionally approved banners retain `previewOnly: false`.

Reproduction at 390 × 950 (mouse and touch), using the real component and native
time, confirmed `paused=false`, `focused=true`, `hovered=true`,
`reducedMotion=false`, `visible=true`, `rotating=false` after Play. Moving the mouse
outside removed `hovered`, but `focused=true` still prevented rotation. Touch also
left compatibility hover active. The button wrongly said Pause because its label
only considered `paused`.

Play now clears the current logical interaction-pause reasons without blurring
the button. A ref distinguishes the playback control from content. Pointer events
track mouse hover only, and new content movement/focus still pauses. No added
timers, forced focus loss, style changes or interval changes are used.

Permanent regression tests execute the real component handlers and interval with
Node's deterministic clock: pause → resume without blur → tick beyond 6000ms →
advance. Mouse, touch, keyboard, renewed interaction, reduced motion and hidden
page scenarios are covered. Browser diagnostics use a temporary read-only React
state inspector outside the repository; no debug attributes/logging ship in the app.

Validation completed on the local production build: 33 automated tests, typecheck,
build and diff checks passed. Native-time Chromium checks passed at 390 × 950 and
320 × 950 with touch emulation, 768 × 1024 tablet, 1440 × 1060 desktop and the
original 390 × 950 mouse viewport. Every viewport remained paused for 6300ms,
then advanced after explicit Play and 6600ms with focus still on the button.
Renewed content focus, keyboard navigation and reduced motion paused as expected;
mouse viewports also checked renewed content hover. No browser runtime errors or
horizontal overflow occurred. Page visibility is covered by the automated handler
test. CSS, images, copy, CTA and Hero match the approved revision.
