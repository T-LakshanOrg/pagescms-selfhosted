# Editor Sidebar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `position: sidebar` field option so a site's `.pages.yml` can put metadata fields in a sticky right column of the entry editor.

**Architecture:** One new field key validated in the config schema and typed in `Field`. The entry form splits top-level fields into main and sidebar groups and, only when the sidebar group is non-empty, wraps them in a two-column responsive grid. Field rendering itself is untouched.

**Tech Stack:** Next.js 16, React, Tailwind v4, Zod, shadcn/ui. No test runner exists in this repo; verification is `npm run lint`, `npx next build`, and a browser check on the deployed dashboard.

Spec: `docs/superpowers/specs/2026-09-14-editor-sidebar-layout-design.md`

Repos:
- Fork (this repo): `/Users/thushara/General/Rino Work/Weekly Projects/pagescms-selfhost`, branch `feat/editor-sidebar-layout`.
- Site: `/Users/thushara/General/Rino Work/Weekly Projects/Hartwell & Grove - PagesCMS`, branch `main`.

Local `next dev` cannot sign in (the GitHub App callback points at Railway), so do not attempt browser testing locally.

---

### Task 1: Accept `position` in the config schema and Field type

**Files:**
- Modify: `lib/config-schema.ts:398-403` (after the `readonly` key)
- Modify: `types/field.ts`

- [ ] **Step 1: Add the schema key**

In `lib/config-schema.ts`, directly after the `readonly:` block (ends with `.nullable(),` at line 403), insert:

```ts
        position: z
          .enum(["sidebar"], {
            message: "'position' must be \"sidebar\".",
          })
          .optional()
          .nullable(),
```

- [ ] **Step 2: Add the type**

In `types/field.ts`, after `readonly?: boolean | null;` add:

```ts
  position?: "sidebar" | null;
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/config-schema.ts types/field.ts
git commit -m "Accept position: sidebar on fields

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Two-column entry form

**Files:**
- Modify: `components/entry/entry-form.tsx:1161-1177` (the `return` of `EntryForm`)

- [ ] **Step 1: Split fields**

Inside `EntryForm`, just before `return (` (after `handleFormSubmit`), add:

```tsx
  const { mainFields, sidebarFields } = useMemo(() => {
    const main: Field[] = [];
    const sidebar: Field[] = [];
    for (const field of fields) {
      if (field?.position === "sidebar") sidebar.push(field);
      else main.push(field);
    }
    return { mainFields: main, sidebarFields: sidebar };
  }, [fields]);
  const hasSidebar = sidebarFields.length > 0;
```

`useMemo` and `Field` are already imported in this file.

- [ ] **Step 2: Replace the return block**

Replace the whole `return ( <Form ...> ... </Form> );` with:

```tsx
  const filenameNode = filePath ? (
    <div className="space-y-2 overflow-hidden">
      <FormLabel>Filename</FormLabel>
      {filePath}
    </div>
  ) : null;

  if (!hasSidebar) {
    return (
      <Form {...form}>
        <form
          id="entry-form"
          onSubmit={handleFormSubmit}
          className="w-full max-w-screen-md mx-auto grid items-start gap-6"
        >
          {filenameNode}
          {renderFields(fields, undefined, registerBeforeSubmitHook, runBeforeValidationHooks)}
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form
        id="entry-form"
        onSubmit={handleFormSubmit}
        className="w-full max-w-screen-lg mx-auto grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="grid items-start gap-6 min-w-0">
          {filenameNode}
          {renderFields(mainFields, undefined, registerBeforeSubmitHook, runBeforeValidationHooks)}
        </div>
        <aside className="grid items-start gap-6 min-w-0 rounded-lg border p-4 lg:sticky lg:top-6">
          {renderFields(sidebarFields, undefined, registerBeforeSubmitHook, runBeforeValidationHooks)}
        </aside>
      </form>
    </Form>
  );
```

Note: `renderFields` is called twice but each field appears in exactly one call, so react-hook-form registration is unchanged.

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npx next build`
Expected: both succeed. (`npx next build` runs `postbuild` migrate only via `npm run build`; using `npx next build` avoids touching the database.)

- [ ] **Step 4: Commit**

```bash
git add components/entry/entry-form.tsx
git commit -m "Render sidebar-positioned fields in a sticky right column

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Document the option in the fork README

**Files:**
- Modify: `README.md` (find the section describing field keys; if none, add a short "Fork additions" section at the end)

- [ ] **Step 1: Add docs**

Append (or insert in the field-options section):

```md
## Fork additions

### `position: sidebar` on fields

Top-level fields with `position: sidebar` render in a sticky right column of the
entry editor (stacked below the main column on narrow screens). Fields without
it render in the main column in config order. Items with no sidebar fields look
exactly as upstream. Nested fields ignore the key.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Document position: sidebar

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Merge, push, deploy

**Files:** none

- [ ] **Step 1: Merge to main and push**

```bash
git checkout main && git merge --ff-only feat/editor-sidebar-layout && git push origin main
```

Use `gh auth switch --user t-lakshan` first if push is refused.

- [ ] **Step 2: Confirm Railway deployed**

Railway is linked to the fork's GitHub repo and deploys `main` (see the site repo's `docs/pagescms-railway-runbook.md`). Wait for the deploy, then load https://pagescms-production.up.railway.app and confirm it responds. If Railway did not auto-deploy, stop and hand the redeploy to the user; `railway` deploy commands are blocked in this environment.

---

### Task 5: Enable it for Hartwell & Grove and record it

**Files:**
- Modify (site repo): `.pages.yml:236-252` (posts collection fields)
- Modify (site repo): `docs/pagescms-hosting-qa.md` Q17

- [ ] **Step 1: Flag the sidebar fields**

In the `posts` collection, add `position: sidebar` to `featuredImage`, `category`, `author`, and `publishDate`:

```yaml
      - name: featuredImage
        label: Featured image
        type: image
        required: true
        position: sidebar
        options: { path: src/assets/posts }
```

```yaml
      - name: category
        label: Category
        type: select
        required: true
        position: sidebar
        options:
          values: [Buying Guides, Market Reports, Neighborhood Spotlights]
```

```yaml
      - name: author
        label: Author byline
        description: Plain text. Not linked to the Agents collection.
        type: string
        required: true
        position: sidebar
```

```yaml
      - { name: publishDate, label: Publish date, type: date, required: true, position: sidebar }
```

- [ ] **Step 2: Commit and push the site repo**

```bash
git add .pages.yml && git commit -m "Move post metadata into the editor sidebar

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

- [ ] **Step 3: Browser verification on the live dashboard**

Open https://pagescms-production.up.railway.app, sign in, open the Hartwell & Grove repo, Blog posts, any post. Check:

1. Desktop: title, slug, excerpt, content on the left; featured image, category, author, publish date in a bordered right column that stays in view when scrolling.
2. Narrow the window below ~1024px: the right column moves under the main column.
3. Edit the category, save, then check the GitHub commit: only `category` changed in the frontmatter.
4. Open Pages, Home: still one column.
5. Temporarily set `position: left` on one field in `.pages.yml` (via the CMS's config editor), confirm the UI reports the config error, then revert.

Take a desktop screenshot of the two-column editor and send it to the user.

- [ ] **Step 4: Note the result in the Q&A doc**

In `docs/pagescms-hosting-qa.md` Q17, replace the sentence "The plan: add an opt-in `position: sidebar` field key ..." with:

```md
Done on 2026-09-14: the fork accepts `position: sidebar` on top-level fields.
The Hartwell & Grove blog posts use it for featured image, category, author
and publish date. Fields without the key keep the single column.
```

Commit:

```bash
git add docs/pagescms-hosting-qa.md && git commit -m "Record the editor sidebar layout as shipped

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
