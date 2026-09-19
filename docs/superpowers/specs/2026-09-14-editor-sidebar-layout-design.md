# Editor sidebar layout — design

Date: 2026-09-14. Status: approved.

## Goal

Let a site's `.pages.yml` opt into a WordPress-style two-column entry editor:
title, slug and body in a main column; metadata such as featured image and
category in a sticky right sidebar. Sites that do not opt in see no change.

## Config

- New optional field key `position`. Only accepted value: `"sidebar"`.
- Validated in `lib/config-schema.ts` alongside `hidden` / `readonly`, with an
  error message of the form `'position' must be "sidebar".`
- Added to the `Field` type in `types/field.ts`.
- Honoured only on top-level fields of an item (collection or file). On fields
  nested inside `object` or `block` it is accepted by the schema but ignored by
  the form.

## Layout (`components/entry/entry-form.tsx`)

- Split top-level fields into `mainFields` (no `position`) and `sidebarFields`
  (`position === "sidebar"`), preserving config order within each group.
- If `sidebarFields` is empty, render exactly the current markup. No visual
  change for existing sites.
- Otherwise render a responsive grid: one column below `lg`, and
  `lg:grid-cols-[minmax(0,1fr)_20rem]` above. The form's max width becomes
  `max-w-screen-lg` in this mode only.
  - Main column: filename line (if any) then `mainFields`, current spacing.
  - Sidebar: `<aside>` with `lg:sticky lg:top-6`, bordered rounded card,
    `sidebarFields` stacked with the current gap.
- Rendering of each field goes through the existing `renderFields` unchanged,
  so lists, rich text, validation, required badges and before-submit hooks are
  untouched. Only the container differs.

## Site config (Hartwell & Grove repo)

Posts collection: add `position: sidebar` to `featuredImage`, `category`,
`author`, `publishDate`. `title`, `slug`, `excerpt`, `body` stay in main.

## Verification

- `npm run lint` and `npx next build` pass in the fork.
- Local dev against the Hartwell & Grove repo: a blog post renders two
  columns on desktop, stacks on a narrow viewport, saves correctly, and the
  committed frontmatter is unchanged apart from the edited value.
- A page with no flagged fields (e.g. Home) renders as before.
- An invalid value (`position: left`) produces a config error in the UI.

## Out of scope

Nested-field placement, per-field widths, tabs, collapsible sidebar sections.
