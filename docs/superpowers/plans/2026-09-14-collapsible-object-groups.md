# Collapsible Object Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a single (non-list) `object` field opt into a collapsible header via `collapsible: true` or `collapsible: { collapsed: true }`, reusing the collapse UI that list items already have.

**Architecture:** The field schema gains a top-level `collapsible` key with the same shape the `list` block already accepts. `SingleField` owns open/closed state for a non-list object group and passes it to `ObjectField`, which treats the group as collapsible and shows the field's label in the header instead of "Item #n". Nothing changes for lists or for objects without the key.

**Tech Stack:** Next.js 16, React, Tailwind v4, Zod. No test runner; verify with `npm run lint` and `npx next build`. Do not run `next dev` (GitHub sign-in only works on the Railway URL).

Branch: `feat/collapsible-groups` in `/Users/thushara/General/Rino Work/Weekly Projects/pagescms-selfhost`.

---

### Task 1: Schema

**Files:**
- Modify: `lib/config-schema.ts` — the list block's `collapsible` union is at ~line 254; the field object schema's `readonly` key is at ~line 398; `position` follows it.
- `types/field.ts` already declares `collapsible?: boolean | { collapsed?: boolean; summary?: string }` on `Field`. No change needed there.

- [ ] **Step 1: Add the key to the field schema**

Directly after the `position:` block in the field object schema (the one that also has `hidden`, `readonly`, `required`), insert:

```ts
        collapsible: z
          .union([
            z.boolean(),
            z.object(
              {
                collapsed: z.boolean().optional(),
                summary: z.string().optional(),
              },
              {
                message:
                  "'collapsible' must be either a boolean or an object with 'collapsed' and 'summary' properties.",
              },
            ),
          ])
          .optional()
          .nullable(),
```

- [ ] **Step 2: Lint**

Run: `npm run lint` — expected: 0 errors (pre-existing warnings are fine).

- [ ] **Step 3: Commit**

```bash
git add lib/config-schema.ts
git commit -m "Accept collapsible on single object fields

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Form behaviour

**Files:**
- Modify: `components/entry/entry-form.tsx` — `ObjectField` (~line 788) and `SingleField` (~line 866).

- [ ] **Step 1: Add a helper near the other small helpers at the top of the file** (after `hasCollapsibleSummary`, ~line 162):

```ts
const isGroupCollapsible = (field: Field) =>
  field.type === "object" && !field.list && !!field.collapsible;

const isGroupDefaultCollapsed = (field: Field) =>
  isGroupCollapsible(field) &&
  typeof field.collapsible === "object" &&
  field.collapsible !== null &&
  !!field.collapsible.collapsed;
```

- [ ] **Step 2: In `ObjectField`, make a group collapsible and label it**

Replace:

```ts
    const isCollapsible = !!(
      field.list &&
      !(typeof field.list === "object" && field.list?.collapsible === false)
    );
```

with:

```ts
    const groupCollapsible = isGroupCollapsible(field);
    const isCollapsible =
      groupCollapsible ||
      !!(
        field.list &&
        !(typeof field.list === "object" && field.list?.collapsible === false)
      );
```

Replace the `itemLabel` assignment:

```ts
    const itemLabel = hasCollapsibleSummary(field) ? (
      <ObjectFieldSummaryLabel
        field={field}
        fieldName={fieldName}
        index={index}
      />
    ) : (
      `Item ${index !== undefined ? `#${index + 1}` : ""}`
    );
```

with:

```ts
    const itemLabel = groupCollapsible ? (
      field.label || field.name
    ) : hasCollapsibleSummary(field) ? (
      <ObjectFieldSummaryLabel
        field={field}
        fieldName={fieldName}
        index={index}
      />
    ) : (
      `Item ${index !== undefined ? `#${index + 1}` : ""}`
    );
```

- [ ] **Step 3: In `SingleField`, own the open state and hide the duplicate label**

`SingleField` is the arrow function starting `const SingleField = ({ field, fieldName, ... })`. Immediately after the existing `useFormContext()` destructure (first hook in the component), add:

```ts
  const groupCollapsible = isGroupCollapsible(field);
  const [groupOpen, setGroupOpen] = useState(!isGroupDefaultCollapsed(field));
  const toggleGroupOpen = useCallback(() => setGroupOpen((v) => !v), []);
```

Make sure `useState` and `useCallback` are in the React import at the top of the file (add them if missing).

Then change:

```ts
  const shouldShowFieldMeta =
    showLabel && (field.label !== false || field.required || showLabelSlot);
```

to:

```ts
  const shouldShowFieldMeta =
    showLabel &&
    !groupCollapsible &&
    (field.label !== false || field.required || showLabelSlot);
```

And in the `<NestedComponent ... />` element inside the `if (["object", "block"].includes(field.type))` branch, change these three props:

```tsx
          isOpen={groupCollapsible ? groupOpen : isOpen}
          onToggleOpen={
            groupCollapsible ? toggleGroupOpen : isCollapsible ? toggleOpen : undefined
          }
          index={isCollapsible ? index : undefined}
```

(`index` line stays as is; only `isOpen` and `onToggleOpen` change.)

- [ ] **Step 4: Lint and build**

Run: `npm run lint && npx next build` — expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add components/entry/entry-form.tsx
git commit -m "Render collapsible single object groups with a toggle header

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: README

**Files:**
- Modify: `README.md` — the "Fork additions" section at the end.

- [ ] **Step 1: Append**

```md
### `collapsible` on single object fields

A non-list `object` field with `collapsible: true` gets a toggle header showing
its label. `collapsible: { collapsed: true }` starts it closed. Validation
errors inside a closed group turn the header red. Lists are unchanged.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Document collapsible object groups

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
