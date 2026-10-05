# DESIGN.md: RepairHub UI Redesign Brief

**For:** Antigravity IDE agent. **Goal:** replace the current dark neon UI with a calm, clean, professional interface people enjoy using. Keep all existing functionality, routes and Firebase auth. Only the visual layer, layout and copy change.

## 1. What is wrong with the current design (remove all of it)
- Dark navy background with glowing gradients and blurry halos
- Neon cyan "AVAILABLE" pills and a glowing glass panel
- Emoji-style icons
- Fake social proof: "Trusted by 2,000+ customers", "2,500 repairs", "150 technicians", "98% satisfaction". **Delete these. Do not invent stats.**
- Big gradient headline with one highlighted phrase
- ALL-CAPS tiny labels, heavy bold everywhere, low contrast text on dark
- Hero shows a decorative status panel instead of something the user can use

## 2. Design direction
**Calm, clear, trustworthy.** Think a well-run clinic or a good banking app: light, airy, lots of whitespace, soft colour, quiet motion. The one memorable element is the **repair request card in the hero** (the user can start a repair immediately). Everything else stays quiet.

## 3. Colour tokens (light theme is default)
| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#F6F8F7` | Page background (cool mist) |
| `--surface` | `#FFFFFF` | Cards, inputs, nav |
| `--surface-soft` | `#EDF3F2` | Section bands, hover fills |
| `--border` | `#DDE5E3` | 1px borders |
| `--ink` | `#1F2A33` | Headings and body (slate, not pure black) |
| `--ink-muted` | `#5B6B75` | Secondary text (meets 4.5:1 on `--bg`) |
| `--primary` | `#2F6F73` | Buttons, links, active states (deep teal) |
| `--primary-hover` | `#265A5E` | Hover/pressed |
| `--primary-tint` | `#E1EEED` | Selected states, soft badges |
| `--success` | `#3F8062` | Completed |
| `--warning` | `#9A6A1F` on `#F8EFD9` | Busy / in progress |
| `--danger` | `#B4443C` on `#F8E4E2` | Errors |

Dark theme (optional, via `prefers-color-scheme`): `--bg #121A1F`, `--surface #1A242A`, `--border #28353C`, `--ink #E6ECEE`, `--ink-muted #9AABB3`, `--primary #7DB9B6`. Desaturated, no glow, no pure black.

**Rules:** no gradients as decoration, no glow, no neon, no more than one accent colour. Shadows are soft and rare: `0 1px 2px rgba(31,42,51,.06), 0 4px 16px rgba(31,42,51,.05)`.

## 4. Typography
- One family: **Figtree** (Google Fonts), fallback `system-ui, sans-serif`
- Weights: 400 body, 500 UI, 600 headings. No 800/900.
- Scale: 14 / 16 / 18 / 22 / 30 / 44 px. Body 16px, line-height 1.6. Headings line-height 1.2, slight negative tracking on 44px.
- **Sentence case everywhere.** No all-caps labels, no tracked-out eyebrows.
- Max line length 65 characters.
- Headlines are plain and solid in one colour. No highlighted single word.

## 5. Layout and spacing
- 8px spacing grid. Container max-width 1120px, side padding 24px (16px mobile).
- Section vertical padding 80px desktop / 48px mobile.
- Radius: 12px for cards and inputs, 10px for buttons, 999px only for status badges. Keep radii consistent.
- Left-aligned text. Do not centre long paragraphs.
- Don't chop every section into identical cards. Use lists, tables, and open layouts where they fit the content.

### Navigation
Sticky top bar, white, 1px bottom border, no blur. Left: logo (simple wordmark "RepairHub" plus a small wrench icon). Centre/left links: Services, How it works, Track repair. Right: Dashboard link and account menu (avatar with initials, dropdown with Log out). Active link: `--primary` text with 2px underline. Mobile: hamburger drawer.

### Home page
```
[ Nav ]
[ Hero ]  Left: H1 + one-sentence subtext + primary CTA + text link
          Right: "Request a repair" card (device select, problem textarea, Submit)
[ Services ]  4 rows: Mobile, Laptop, Computer, TV. Icon + name + one line + "Request" link
[ How it works ]  4 steps (a real sequence, so numbering is fine)
[ Track a repair ]  small input: repair ID, "Track"
[ Footer ]  links, contact, copyright
```
**Hero copy (use this, no more fluff):**
- H1: `Repair your devices without leaving home`
- Subtext: `Tell us what's wrong, a technician accepts your request, and you follow every step online.`
- Primary button: `Request a repair`; text link: `See how it works`

Do not add statistics, trust badges or testimonials unless real data exists.

## 6. Components
- **Buttons:** primary (filled teal, white text), secondary (white, teal border), text link. Height 44px. Clear focus ring: 2px `--primary` offset 2px.
- **Inputs:** white, 1px border, 44px height, label above (not placeholder-only), helper and error text below.
- **Status badges:** soft tint background + dark text of the same hue, with a small dot. Requested (grey), Accepted (teal), In progress (amber), Repaired (green), Completed (green, filled tint). No neon.
- **Service rows:** icon in a 40px tinted square, name, short description. Use **Lucide** icons (stroke 1.5), never emoji.
- **Cards:** white, 1px border, 12px radius, optional faint shadow. Only for content that is a distinct object (a repair request, the request form).
- **Empty states:** one sentence plus a button, e.g. `No repairs yet. Request your first repair.`
- **Errors:** say what happened and how to fix it. No apologies.

## 7. Pages
- **Services:** list of device types with typical issues covered. No invented prices.
- **How it works:** four numbered steps: Describe the problem, Technician accepts, Repair in progress, Collect or receive your device.
- **Track repair:** repair ID field, then a vertical timeline stepper: Requested → Accepted → In progress → Repaired → Completed. Current step highlighted in teal, completed steps with a check, future steps grey. Show device, problem and technician name beside it.
- **Dashboard (customer):** page title, "New request" button, table/list of requests (ID, device, status badge, date). Click opens detail.
- **Dashboard (technician):** tabs: Open requests / My jobs. Row actions: Accept, Update status.
- **Login / sign up:** single centred card (max 400px) on `--bg`, Firebase auth, clear errors.

## 8. Motion (minimal)
Animation should be barely noticeable. If a user can describe an animation, it's too much.

**Allowed**
- Hover, focus and active states: 150ms ease on colour, background, border
- Buttons: slight darken on hover, 1px press on click (no scaling or bouncing)
- Dropdowns, drawer and modals: 150-200ms fade (opacity only, optional 4px slide)
- Status changes: badge colour cross-fade at 200ms
- Track page timeline: the active step's colour fades in once on load
- Loading: a simple spinner or skeleton, no shimmer effects

**Not allowed**
- Scroll-triggered or entrance animations on sections or cards
- Parallax, floating, pulsing, glowing, gradient-shifting or typewriter effects
- Hover lift/zoom on cards
- Animated counters or background animation
- Page transition effects

**Technical rules**
- Animate only `opacity`, `color`, `background-color`, `border-color`, `box-shadow`
- Put durations and easing in tokens: `--motion-fast: 150ms`, `--motion-base: 200ms`, `--ease: cubic-bezier(0.2, 0, 0, 1)`
- Wrap everything in `@media (prefers-reduced-motion: reduce)` and disable all transitions there
- No animation libraries; plain CSS transitions only

## 9. Accessibility and quality floor
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI borders and icons
- Visible keyboard focus on every interactive element
- Semantic HTML (`nav`, `main`, `section`, `button`), labels linked to inputs
- Responsive: 360px, 768px, 1280px. No horizontal scroll.
- Touch targets ≥ 44px
- Don't rely on colour alone for status (badge includes text)

## 10. Implementation notes
- Define all tokens as CSS variables in one `tokens.css`, and use them everywhere (no hard-coded hex elsewhere).
- Remove the old glow, gradient and glass styles and any unused CSS.
- Keep existing backend routes, Firebase auth and data logic untouched.
- Replace all emoji and old icons with Lucide.
- Remove every fabricated number from the UI.

## 11. Definition of done
- [ ] Light, calm look, no gradients or glow anywhere
- [ ] Fake stats and badges removed
- [ ] Only Figtree, sentence case, weights 400/500/600
- [ ] Hero contains the working request card
- [ ] Track page shows the status timeline
- [ ] Only the minimal CSS transitions from section 8 exist
- [ ] Passes keyboard-only navigation and mobile layout check
- [ ] No console errors, auth flow still works

## Prompt to paste into Antigravity
> Read `docs/DESIGN.md` and redesign the whole frontend to match it exactly. Keep all functionality and Firebase auth working. First list the files you will change, then implement `tokens.css`, the nav, hero with request card, services, how-it-works, track repair, dashboard, and login pages. Remove all old neon/glow/gradient styles and fake statistics. Show me screenshots at 360px and 1280px when done.
