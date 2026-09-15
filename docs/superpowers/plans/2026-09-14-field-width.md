# Field Width (side-by-side fields) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a field opt into half width with `width: half`, so two consecutive half-width fields sit side by side on screens ≥ 640px and stack on narrow screens.

**Architecture:** `renderFields` wraps every rendered field in a `<div data-width=...>`. Containers that hold a list of fields get a `field-grid` CSS class (defined once in `app/globals.css`): a two-column grid where children span both columns unless `data-width="half"`. Containers without the class (the editor sidebar, list-item rows) are unaffected. Fields without the key look exactly as before.

**Tech Stack:** Next.js 16, React, Tailwind v4, Zod. No test runner; verify with `npm run lint` and `npx next build`. Do not run `next dev`.

Branch: `feat/field-width` in `/Users/thushara/General/Rino Work/Weekly Projects/pagescms-selfhost`.

---

### Task 1: Schema and type

**Files:**
- Modify: `lib/config-schema.ts` — field object schema, directly after the `collapsible:` block added earlier (which follows `position:`).
- Modify: `types/field.ts`

- [ ] **Step 1: Schema key**

Insert after the `collapsible:` block in the field object schema:

```ts
        width: z
          .enum(["half"], {
            message: "'width' must be \"half\".",
          })
          .optional()
          .nullable(),
```

- [ ] **Step 2: Type**

In `types/field.ts`, after `position?: "sidebar" | null;` add:

```ts
  width?: "half" | null;
```

- [ ] **Step 3: Lint** — `npm run lint`, expected 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/config-schema.ts types/field.ts
git commit -m "Accept width: half on fields

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: CSS

**Files:**
- Modify: `app/globals.css` — append at end of file.

- [ ] **Step 1: Add the grid utility**

```css
/* Fork addition: containers of fields. A child with data-width="half"
   takes one column on sm+ screens; everything else spans both. */
.field-grid {
  display: grid;
  align-items: start;
  gap: calc(var(--spacing) * 6);
}
@media (min-width: 640px) {
  .field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .field-grid > * {
    grid-column: span 2 / span 2;
  }
  .field-grid > [data-width="half"] {
    grid-column: span 1 / span 1;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "Add field-grid layout utility

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Wrap fields and switch containers

**Files:**
- Modify: `components/entry/entry-form.tsx`

- [ ] **Step 1: Wrap each rendered field in `renderFields`**

In the `renderFields` callback (starts `const renderFields: RenderFields = useCallback(`), the `fields.map((field) => { ... })` body currently returns either a `<ListField .../>` or a `<SingleField .../>` with `key={currentFieldKey}`. Change it so both are wrapped:

```tsx
        const node =
          effectiveField.list === true ||
          (typeof effectiveField.list === "object" &&
            effectiveField.list !== null) ? (
            <ListField
              field={effectiveField}
              fieldName={currentFieldName}
              renderFields={renderFields}
              registerBeforeSubmitHook={registerBeforeSubmitHook}
              runBeforeSubmitHooks={runBeforeSubmitHooks}
            />
          ) : (
            <SingleField
              field={effectiveField}
              fieldName={currentFieldName}
              keyPrefix={currentFieldKey}
              renderFields={renderFields}
              registerBeforeSubmitHook={registerBeforeSubmitHook}
              onChangeRegistered={onChangeRegistered}
            />
          );
        return (
          <div
            key={currentFieldKey}
            className="min-w-0"
            data-width={effectiveField.width ?? undefined}
          >
            {node}
          </div>
        );
```

Remove the `key` props from `ListField`/`SingleField` themselves (the wrapper carries the key). Keep the existing `if (!field || field.hidden) return null;` guard above unchanged.

- [ ] **Step 2: Switch the field containers to `field-grid`**

Make exactly these class changes (find by content):

1. Blocks content, currently `className={cn("p-4 grid gap-6 border-t", isOpen ? "" : "hidden")}` → `className={cn("p-4 field-grid border-t", isOpen ? "" : "hidden")}`
2. Object content, currently a `cn("p-4 grid gap-6", isCollapsible && "border-t", isOpen ? "" : "hidden")` → replace `"p-4 grid gap-6"` with `"p-4 field-grid"`
3. Single-column form, `className="w-full max-w-screen-md mx-auto grid items-start gap-6"` → `className="w-full max-w-screen-md mx-auto field-grid"`
4. Sidebar-mode main column, `<div className="grid items-start gap-6 min-w-0">` → `<div className="field-grid min-w-0">`

Do NOT change the `<aside>` (sidebar stays one column) or the `ListItemRow` inner `grid gap-6 flex-1`. Do NOT change the outer sidebar-mode `<form>` classes.

- [ ] **Step 3: Lint and build** — `npm run lint && npx next build`, both must pass.

- [ ] **Step 4: Commit**

```bash
git add components/entry/entry-form.tsx
git commit -m "Render width: half fields side by side

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: README

**Files:**
- Modify: `README.md`, "Fork additions" section at the end.

- [ ] **Step 1: Append**

```md
### `width: half` on fields

A field with `width: half` takes half the row on screens 640px and wider; two
consecutive half-width fields sit side by side. Other fields span the full
row. Everything stacks on narrow screens. Ignored inside the editor sidebar.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Document width: half

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
