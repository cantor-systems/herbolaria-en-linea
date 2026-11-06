# Home promotional slider — HERB-WEB-001

The slider is inserted immediately below the global header and before the existing,
unchanged `HeroBanner`. It introduces no commercial service or new dependency.

## Configuration and publication

Edit `src/content/promotional-slides.ts`: identifier, campaign kind, desktop/mobile
images, focal positions, alt text, eyebrow, headline, CTA, internal destination,
order, active flag and optional ISO 8601 dates with timezone. The start is inclusive;
the end is exclusive. Invalid or inverted dates omit the slide. Home revalidates
every 60 seconds; campaign boundaries therefore have cache/revalidation latency
and are unsuitable for enforcing commercial prices or eligibility.

All initial images are existing catalogue/editorial references, **not approved
commercial photography**. Each slide is `previewOnly: true`, visibly labelled
“Preview · Imagen de referencia”. The server includes those slides only in Vercel
Preview or local `next dev`. Production and local production builds omit them.
No client flag, public environment variable or query parameter enables them there.
`VERCEL_ENV` must be exposed by Vercel's system environment variables setting;
if absent, reference slides are omitted. See the [official environment reference](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_env).
Never promote a Preview artifact directly to Production: it was built with Preview
content. A future production publication requires its own production build.

Before production publication, obtain explicit approval for final photographs,
replace the portrait reference files with optimized panoramic desktop and mobile
assets, review their framing/alt text, then change the corresponding `previewOnly`
flag. Do not treat the reference packaging as an exact commercial representation.
The current desktop crops are temporary and do not reproduce the full panoramic
product composition in the approved mockup. The mockup itself is not shipped.

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
