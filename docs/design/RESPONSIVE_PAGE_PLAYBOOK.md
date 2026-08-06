# Responsive Page Playbook

> **Use this doc every time you create or restyle an app-shell page.**  
> Goal: content aligns correctly on phone, tablet-width mobile layout, and desktop — same visual language as existing CoreKnot pages.

**Related (do not duplicate):**

| Doc | Role |
|-----|------|
| [DESIGN-REFERENCE.md](./DESIGN-REFERENCE.md) | Ideology + checklist before UI edits |
| [COREKNOT_DESIGN_SYSTEM.md](./COREKNOT_DESIGN_SYSTEM.md) | Tokens, archetypes, route map |
| [COMPONENT_STANDARDS.md](../reference/COMPONENT_STANDARDS.md) | Which components to import |
| `client/src/hooks/useBreakpoint.js` | Breakpoint source of truth |
| `client/src/index.css` | `.tm-page-shell`, gutters, list chrome |

**Scope:** Zone A — logged-in app shell (`MainLayout`).  
**Out of scope:** Zone B marketing/auth (cream/teal) — see design system §2.

---

## 0. Decision tree (start here)

```
New page?
├─ Public / auth / landing → Zone B rules (not this playbook)
├─ Tabbed module (CRM / Office / Management) → Archetype C: TabHubLayout
├─ CRUD list / searchable table → Archetype A: ListPageLayout
├─ Row detail / edit overlay → Archetype B: FullScreenWorkspace
├─ Sparse utility / empty / 404 → Archetype D: PageHeader + EmptyState
├─ Settings-like prefs → follow Settings split-pane (exception) or PageContainer
└─ Dashboard widgets → Archetype G: DashboardWidgetShell (do not invent)
```

**Never invent a new page shell.** Pick an archetype, then apply the responsive recipes below.

---

## 1. Breakpoints (locked)

| Label | Width | Tailwind | Hook |
|-------|-------|----------|------|
| **Mobile** | `≤ 1023px` | default / `max-lg:` | `useIsMobile()` |
| **Desktop** | `≥ 1024px` | `lg:` | `useIsDesktop()` |

```js
import { useIsMobile, useIsDesktop, MOBILE_MAX, DESKTOP_MIN } from '../hooks/useBreakpoint';
```

**Rules:**

- Use **`lg:`** (1024) as the primary layout switch — not `md:` (768) for shell/chrome decisions.
- `sm:` / `md:` OK only for **intra-mobile** grids (e.g. `grid-cols-1 sm:grid-cols-2`).
- **PWA desktop** (`isPwaDesktop()`) forces desktop layout regardless of width — hooks already handle this.
- Prefer CSS/`lg:` classes over JS branching when both work; use hooks when behavior differs (sheet vs drawer, pull-to-refresh).

---

## 2. Shell & gutters (do not double-pad)

`MainLayout` wraps routes in **`.tm-page-shell`**, which owns horizontal padding:

| Token | Value | When |
|-------|-------|------|
| `--page-gutter` | `0.9rem` | Mobile |
| `--page-gutter-desktop` | `1.125rem` | Desktop (`lg+`) |
| `--list-section-gap` | `1rem` | Vertical rhythm mobile |
| `--list-section-gap-lg` | `1.5rem` | Vertical rhythm desktop |

**Do:**

- Let `.tm-page-shell` provide outer gutters.
- Stack sections with `gap-[var(--list-section-gap)]` / `lg:gap-[var(--list-section-gap-lg)]` or reuse layout components that already do.

**Don't:**

- Add another full-page `px-4` / `p-6` around the whole route (double padding).
- Use arbitrary max-width on list pages (`ListPageLayout` is full-bleed inside the shell).
- Rely on `PageContainer` default `maxWidth={1600}` for list/data pages — only for utility/detail that need a reading column.

**Mobile bottom clearance:** bottom nav + safe area. Prefer layout primitives; if custom scroll region, leave room for bottom nav (existing pages use shell padding-bottom / list layouts). Never put primary CTAs under the nav.

---

## 3. Content alignment recipes

### 3.1 Vertical stack (default)

Almost every page is a **single column** that grows vertically:

```
[ optional overview / KPIs ]
[ toolbar / header row ]
[ workspace: table | cards | form ]
```

Align with flex column + token gaps — not absolute positioning.

```jsx
{/* Prefer ListPageLayout — it already stacks correctly */}
<ListPageLayout
  overview={/* DataOverviewSection or null */}
  toolbar={/* PageToolbar */}
>
  {/* DataTable or mobile card list */}
</ListPageLayout>
```

### 3.2 Header / toolbar rows

| Viewport | Pattern |
|----------|---------|
| Mobile | `flex flex-col gap-2` — title, then search, then actions (full width) |
| Desktop | `flex flex-row items-center justify-between gap-3` — title left, actions right |

`PageToolbar` already encodes this. Custom headers (rare):

```jsx
<header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 min-h-[44px]">
  <div className="min-w-0 flex-1">{/* title / chips */}</div>
  <div className="flex flex-wrap gap-2 w-full lg:w-auto shrink-0">{/* actions */}</div>
</header>
```

- Controls: `min-h-[44px]` on mobile.
- Text inputs: `text-base` (16px) on mobile to avoid iOS zoom — primitives usually handle this.

### 3.3 Tables ↔ cards

`DataTable` from `components/ui`:

| Viewport | Behavior |
|----------|----------|
| Desktop | `hidden lg:table` — real table |
| Mobile | `lg:hidden` card/stack — built into `DataTable` |

**Do not** wrap `DataTable` in `Card`.  
**Do not** build a second custom mobile list unless documenting an exception (Todo, Schedule, Attendance calendars).

Hide low-value columns on smaller desktop with `hidden lg:table-cell` only when the column is truly secondary.

### 3.4 KPI / metric grids

```jsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {/* MetricCard / overview tiles */}
</div>
```

- Mobile: 2 columns (dense, scannable).
- Desktop: 3–4 columns depending on count.
- Prefer `DataOverviewSection` on list pages over one-off KPI rows.

### 3.5 Two-column content (forms, reports)

```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
  <section className="min-w-0">…</section>
  <section className="min-w-0 border-t border-[var(--color-bg-border)] pt-4 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0">
    …
  </section>
</div>
```

Always `min-w-0` on grid children to prevent overflow.

### 3.6 Detail split (65 / 35)

`FullScreenWorkspace` + `DetailSidebarShell`:

| Viewport | Behavior |
|----------|----------|
| Desktop | Side-by-side main + sidebar |
| Mobile | Stacked or sheet — follow existing workspace component; do not hand-roll |

### 3.7 Hub tabs

`TabHubLayout` + `ModuleSubnav`:

| Viewport | Behavior |
|----------|---------|
| Mobile | Horizontal scroll / wrapping pills, `min-h-[44px]` |
| Desktop | Single row + sliding teal active pill |

Tab state via `?tab=` — do not invent parallel tab state.

### 3.8 Filters

| Viewport | UI |
|----------|-----|
| Mobile | Bottom sheet (`SelectionFilterPanel` → `MobileFilterSheet`) |
| Desktop | Right drawer |

Wire filters through `ListPageLayout` `filterFields` — **not** toolbar dropdowns.

---

## 4. Archetype → responsive checklist

### A — List / data

- [ ] `ListPageLayout` + `PageToolbar` + `DataTable` (or documented exception)
- [ ] Overview optional; if present, **no** duplicate `PageHeader` title
- [ ] Filters via `filterFields` / `SelectionFilterPanel`
- [ ] Loading: `PageLoadGuard` + `PageSkeleton`
- [ ] Empty: `EmptyState` with verb CTA
- [ ] Errors: `queryError` / `QueryErrorSlot` + retry
- [ ] No outer `Card` around the table
- [ ] No page-level max-width

### B — Detail overlay

- [ ] Open from row click → `FullScreenWorkspace`
- [ ] No “Actions” table column
- [ ] Ghost inputs / sidebar via `DetailSidebarShell` where pattern exists
- [ ] Escape closes; focus trap from shell

### C — Tab hub

- [ ] `TabHubLayout` / `HubPageLayout` + `ModuleSubnav`
- [ ] Child tabs are list pages (Archetype A) or known exceptions
- [ ] URL `?tab=` synced

### D — Utility / sparse

- [ ] `PageContainer` or simple column inside shell
- [ ] One `.tm-page-title`, one primary CTA
- [ ] Centered empty states OK; still use token colors

### G — Dashboard

- [ ] `DashboardWidgetShell` + existing section helpers
- [ ] Widget min-heights: prefer existing `dashboardSections` helpers (`min-h` + `lg:min-h`)
- [ ] Do not copy Dashboard’s one-off title/max-width quirks into new pages

---

## 5. Styling tokens (copy these, not hex)

### Colors (app shell)

| Role | Prefer |
|------|--------|
| Canvas | page shell / `var(--color-bg-*)` from tokens |
| Surface | `var(--color-bg-surface)` / white surfaces |
| Border | `border-[var(--color-bg-border)]` (`#c5d0de` family) |
| Primary CTA / focus | `var(--color-action-primary)` / `--brand-green` `#126d5e` |
| Muted text | `.tm-data-meta` or muted token |

**One accent only** in app shell. No cream (`#fcf8f2`) on product pages.

### Type

| Role | Class / token |
|------|----------------|
| Page title | `.tm-page-title` |
| Section label | `.tm-section-label` |
| Body | `.tm-body` / `.tm-data-primary` |
| Meta | `.tm-data-meta` |
| Metrics | `tabular-nums` |
| Font | `--font-interface` (Geist Variable) |

### Radius & elevation

| Use | Token |
|-----|-------|
| Buttons / inputs | `--radius-atomic` (~4px) |
| Small panels | 6–8px family from tokens |
| Modals / floating | `.tm-floating` **only** place for shadows |

Static cards/tables: **borders, never box-shadow**.

### Spacing (4px grid)

- Control padding: lean on primitives.
- Section gaps: `--list-section-gap` / `--list-section-gap-lg`.
- Group related items tighter than unrelated groups (proximity hierarchy).

---

## 6. Component imports (required)

```js
import {
  Button,
  DataTable,
  EmptyState,
  PageLoadGuard,
  PageSkeleton,
  SearchInput,
  // …
} from '../components/ui';
import { ListPageLayout } from '../components/ui/ListPageLayout'; // or barrel if exported
import { PageToolbar } from '../components/ui/PageToolbar';
```

| Need | Use |
|------|-----|
| Buttons | `Button` from primitives — never raw `<button className="bg-…">` |
| Confirms | `globalConfirm` / `NexusModal` |
| Toasts | `useToast()` |
| Dates | `formatDisplayDate` → **DD/MM/YYYY** |
| Users | `UserAvatar` / `UserLabel` |
| Modals | `NexusModal` or `ModalShell` — see component standards decision tree |

Living gallery: route `/components` (`ComponentsShowcase`).

---

## 7. Mobile / desktop behavior matrix

| Concern | Mobile (≤1023) | Desktop (≥1024) |
|---------|----------------|-----------------|
| Nav | Bottom navigation | Collapsible sidebar (~60 / ~236px) |
| Page padding | `--page-gutter` | `--page-gutter-desktop` |
| Filters | Bottom sheet | Right drawer |
| Tables | Card stack | `<table>` |
| Touch targets | ≥ 44×44px | Can be denser |
| Input font | ≥ 16px | Can be `text-sm` |
| Hub tabs | Wrap / scroll, 44px min height | Single row + sliding pill |
| Detail | Stacked workspace | 65/35 split |
| Recommended UX | Soft `DesktopRecommendedBanner` where dense ops hurt | Full density |

---

## 8. Scaffold templates

### 8.1 Minimal list page

```jsx
import { PageLoadGuard, PageSkeleton, DataTable, EmptyState } from '../components/ui';
import ListPageLayout from '../components/ui/ListPageLayout';
import PageToolbar from '../components/ui/PageToolbar';

export default function ExampleListPage() {
  const { data, isLoading, error, refetch } = useExampleQuery();

  return (
    <PageLoadGuard loading={isLoading} skeleton={<PageSkeleton />}>
      <ListPageLayout
        queryError={error}
        onRetry={refetch}
        toolbar={
          <PageToolbar
            title="Examples"
            search={<SearchInput value={q} onChange={setQ} placeholder="Search…" />}
            actions={<Button variant="primary">New example</Button>}
          />
        }
        filterFields={filterFields}
        filtersInPanel
      >
        <DataTable
          columns={columns}
          rows={data ?? []}
          onRowClick={(row) => openDetail(row)}
          empty={<EmptyState title="No examples" actionLabel="Create one" onAction={…} />}
        />
      </ListPageLayout>
    </PageLoadGuard>
  );
}
```

### 8.2 Responsive custom section (when layout component not enough)

```jsx
<section className="flex flex-col gap-[var(--list-section-gap)] lg:gap-[var(--list-section-gap-lg)] min-w-0">
  <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 min-h-[44px]">
    <h1 className="tm-page-title min-w-0 truncate">Title</h1>
    <div className="flex flex-wrap gap-2 w-full lg:w-auto">{/* actions */}</div>
  </header>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
    <div className="min-w-0 border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] p-4">
      …
    </div>
    <div className="min-w-0 border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] p-4">
      …
    </div>
  </div>

  {/* Desktop table / mobile cards: prefer DataTable */}
</section>
```

### 8.3 Overflow-safe flex child

Any flex/grid child that holds text or a table:

```jsx
<div className="min-w-0 flex-1 overflow-x-auto">
```

Without `min-w-0`, long strings blow out the viewport on mobile.

---

## 9. Anti-patterns (reject in review)

| Anti-pattern | Fix |
|--------------|-----|
| Extra page `px-*` inside `.tm-page-shell` | Remove; shell owns gutters |
| `md:` for sidebar / table / filter switch | Use `lg:` (1024) |
| Cream / marketing colors in app routes | Zone A slate + green only |
| Card shadow on static panels | Border only; `.tm-floating` for overlays |
| Custom button / input CSS | `Button` / primitives |
| Toolbar filter dropdowns | `SelectionFilterPanel` |
| `DataTable` inside `Card` | Flush on workspace |
| Page subtitle under title | No subtitles in chrome |
| Duplicate title + overview | Title in toolbar **or** overview context, not both |
| Hardcoded hex for brand green | CSS variables |
| Horizontal page scroll | `min-w-0`, stack columns, hide secondary cols |
| Primary CTA under bottom nav | Reorder; keep actions in toolbar |
| New page shell “just for this feature” | Pick archetype A–G |

---

## 10. Verify before done

Resize (or DevTools) and confirm:

1. **375px** — no horizontal scroll; 44px targets; filters open as sheet; table → cards.
2. **768px** — still **mobile** layout (≤1023); not a broken half-desktop.
3. **1280px** — sidebar + table; filters drawer; header single row.
4. **Dark mode** — borders/surfaces from tokens; accent still only on actions/focus.
5. **Keyboard** — tab order, focus ring, Escape closes panels.
6. **Sibling match** — looks like Leads / Contacts / Subscriptions (same hub), not a one-off.

Checklist from [DESIGN-REFERENCE.md](./DESIGN-REFERENCE.md) still applies after layout is correct.

---

## 11. Agent prompt snippet

Paste when asking an agent to build a page:

```
Follow coreknot/docs/design/RESPONSIVE_PAGE_PLAYBOOK.md.
Pick archetype A–G. Use ListPageLayout / TabHubLayout / FullScreenWorkspace as specified.
Breakpoints: mobile ≤1023 (default), desktop lg: ≥1024. No double padding inside tm-page-shell.
One accent (action-primary). Borders not shadows. DD/MM/YYYY. Verify at 375 / 768 / 1280.
```
