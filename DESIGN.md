# Design system

## Surface

Mariam-Art is an artwork portfolio. The gallery is an experience surface: photographs lead, while filters, captions, and navigation stay quiet and easy to use.

## Visual world

The site reads as a small artist's studio at two times of day. The light theme is a bright, warm paper gallery with dark ink, fine brass rules, framed work, and broad breathing room, based on the owner's five supplied page references. The dark theme is the same studio after dusk: charcoal walls, pale lettering, and restrained gold. Each theme is composed from its own surface and text colors; photographs keep their original appearance in both.

## Palette roles

- Light ground: warm paper `#f7f2e9`; secondary sheet `#efe7da`; card surface `#fcfaf6`; ink `#241e18`; secondary ink `#60574c`; brass `#95652d`.
- Dark ground: charcoal `#100f0d`; raised surfaces `#191612` and `#211c16`; paper lettering `#eee7dc`; secondary lettering `#b8ac9b`; brass `#c9a271`.
- Lines are thin and low contrast. Gold marks navigation, focus, and selected controls; it does not replace text contrast.

## Typography

Keep the site's self-hosted Playfair Display and Cormorant Garamond display voices, Jost for navigation and metadata, and the Noto Armenian families for Armenian pages. Headings are editorial; labels remain compact and plainly readable.

## Composition and media

- Keep artwork photography uncropped at its 3:4 source ratio in gallery and detail views.
- Give each image a fine frame and a quiet paper or charcoal mat that follows the selected theme.
- The gallery uses a responsive column grid, category filters, and numbered captions.
- The light header sits on a solid paper ground; the dark header uses a charcoal scrim over the hero.
- Light page fields use broad, subtle warm-light falloff rather than a brightness filter over the dark theme.

## Interaction and motion

- A theme toggle switches the page's palette with short color transitions. No white wash, page overlay, image brightness animation, or whole-page crossfade is used.
- Keep filter, search, language, lightbox, menu, and inquiry-link behavior intact.
- Honor `prefers-reduced-motion`; hover movement remains small and does not move artwork itself.

## Responsive and accessible behavior

- Reflow galleries to one column on narrow screens and keep filter controls horizontally scrollable.
- Preserve visible keyboard focus and readable contrast in both themes.
- Give image dimensions in markup to avoid layout shifts.
- Follow the site's English, Russian, and Armenian translations for all added category labels and artwork titles.
