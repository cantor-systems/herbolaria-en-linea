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

The banners now use the three panoramic candidates supplied by the owner, without
embedded promotional copy. Final visual approval is still pending; their
unbranded bottles are contextual imagery, not exact Moronel packaging. Each slide
remains `previewOnly: true`, visibly labelled
“Preview · Imagen de referencia”. The server includes those slides only in Vercel
Preview or local `next dev`. Production and local production builds omit them.
No client flag, public environment variable or query parameter enables them there.
`VERCEL_ENV` must be exposed by Vercel's system environment variables setting;
if absent, reference slides are omitted. See the [official environment reference](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_env).
Never promote a Preview artifact directly to Production: it was built with Preview
content. A future production publication requires its own production build.

Before production publication, obtain explicit approval for the photographs,
review desktop/mobile framing and alt text, then change the
corresponding `previewOnly` flag under a separate publication authorization.
The mockup itself is not shipped. The existing catalogue images and Hero are unchanged.

## Panoramic candidates

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
the slider. Mobile crops and the use of contextual unbranded bottles require
visual approval before production eligibility changes.

The packages destination is `/categoria/paquetes-y-promociones`. No percentage,
gift, launch, price or expired coupon is advertised by the new component.

## Interaction and accessibility

Six-second autoplay runs only with multiple slides, visible document, no hover/focus,
and no reduced-motion preference. Manual navigation pauses it until the user
resumes. Arrows, indicators and pause/resume have accessible names and touch
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
- A local production build omitted the reference slider and retained the original H1.
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
- Source and repository asset hashes match. All three slides remain Preview-only.
