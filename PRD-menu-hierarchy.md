# PRD: Papa Johns Menu Management — Hierarchical Content with Inheritance

| | |
|---|---|
| **Status** | Draft v1 |
| **Author** | Shehjad Khan (Sanity) |
| **Date** | 2026-06-11 |
| **Reference implementation** | [jjburbridge/markets PR #2 — "Hierarchy and inheritance"](https://github.com/jjburbridge/markets/pull/2) |

---

## 1. Background & Problem Statement

Papa Johns needs to manage their menu in Sanity with a **multi-level hierarchy**:

```
Global menu (canonical)
  └─ Region / Market (e.g. US, UK, MENA — or finer: US-Northeast)
       └─ Local store (e.g. Store #4421, Hoboken NJ)
```

Most menu content is defined **once globally** (item names, descriptions, imagery, category structure, modifier groups). Regions adapt it (localized names, regional items like a UK-only side, regulatory info such as allergen/calorie disclosure). Stores adapt it further (price, availability/86'd items, store-exclusive promotions).

The core problem is **inheritance with overrides**: a store's *effective menu* is the global menu, layered with regional changes, layered with store changes — without duplicating thousands of menu items per store, and without letting a store manager accidentally edit global content.

At Papa Johns scale (~6,000 stores globally), naive approaches fail:

- **Full duplication per store** → millions of documents, no single source of truth, global edits require mass migration.
- **One flat document with per-store fields** → unbounded document size, no per-store permissions, merge conflicts.

We need a model where each level stores **only its deltas** (additions, removals, field overrides), and the effective menu is composable.

## 2. Reference Implementation

PR [jjburbridge/markets#2](https://github.com/jjburbridge/markets/pull/2) is a working proof-of-concept of **both** viable inheritance strategies, built on the multi-market Studio starter (one workspace per market):

### Strategy A — Resolve-at-read ("delta documents", `collection` type)

- Each document carries `parentCollection` (reference up the chain), its **own** `links[]` (additions), and `removedLinks[]` (an exclusion/tombstone list).
- The effective list is computed at **read time**: a GROQ query expands `parentCollection->` to a bounded depth (4 levels in the PR) and the client merges `own links + ancestor links − removedLinks` walking up the chain.
- A custom Studio field component (`component/CombinedLinks.tsx`, using `@sanity/sdk-react`'s `useQuery` with `perspective: 'drafts'`) renders the merged, *effective* view inside the editor — editors see inherited items live, visually distinguished from their own.

### Strategy B — Materialize-at-write ("sync", `collectionSync` type + Sanity Function)

- Same parent reference, but children hold a **full materialized copy** of the list.
- A Sanity Function (`functions/hierarchy-sync`, a `documentEventHandler` registered in `sanity.blueprint.ts` on create/update/delete of `collectionSync`) diffs `before()`/`after()` projections, computes added/removed links, fetches all children (`*[parentCollection._ref == $id]`), and patches them in **one transaction**, preserving each child's local additions.
- Because the patch re-triggers the function on each child, changes **cascade down multiple levels automatically** (global → region → store).

### Also in the PR (reusable regardless of strategy)

- **`CreateChildAction`** — a custom document action that clones the current document as a draft, sets `parentCollection` to the source, and suffixes the title. This is the editor's "derive a regional/store version" button.
- **Workspace-per-market Studio config** (the `markets` repo baseline) — each market gets its own workspace with scoped structure, language config, and templates.

### Verdict on the PoC

It validates the patterns but is intentionally minimal. Gaps to productionize (addressed in this PRD): field-level overrides (not just list membership), depth-bounded GROQ, function rate limits at fan-out scale, permissions, draft-vs-published semantics in sync (the function listens to publish-time events; unpublished drafts won't propagate), and `_key` collision assumptions in the diffing logic.

## 3. Goals

1. Single source of truth: a menu item's canonical content lives in exactly one global document.
2. Each hierarchy level stores **only deltas**: added items, removed items, and field-level overrides (price, name, description, availability).
3. Editors at every level see the **effective menu** (post-inheritance) in the Studio, with clear visual distinction between inherited, overridden, and local content.
4. Role-based editing: global team edits global; regional managers edit their region; store operators edit only their store's overrides (price, availability).
5. A frontend/API consumer can fetch the **resolved effective menu for any store** with one query/endpoint, fast enough to serve ordering apps.
6. Changes propagate predictably: a global price-structure change reaches all stores without manual per-store edits.
7. Support localization per market (the markets starter already provides document-internationalization per workspace).

## 4. Non-Goals

- Real-time inventory/86'ing driven by POS systems (integration point is defined, but the POS pipeline itself is out of scope for v1).
- Order pricing logic (tax, coupons, bundles) — we model list prices and availability only.
- Migrating the existing menu data (separate migration plan).
- Franchisee self-service onboarding flows.

## 5. Personas

| Persona | Level | Needs |
|---|---|---|
| Global Menu Admin (HQ) | Global | Author canonical items/categories/modifiers; see impact of changes; schedule launches (Content Releases) |
| Regional/Market Manager | Region | Localize names/descriptions; add regional items; suppress items not sold in region; set regional default prices |
| Store Operator / Franchisee | Store | Override price; toggle availability; add store-local promos; **must not** edit anything above store level |
| Frontend / Ordering Platform | Consumer | Fetch resolved menu per store, cacheable, with stable IDs |

## 6. Content Model

### 6.1 Canonical (global) types

```
menuItem        — name, slug, description, image, modifierGroups[], dietary/allergen,
                  defaultPrice, sku/plu (external system key)
menuCategory    — name, slug, items[] (references, ordered), display rules
modifierGroup   — name, min/max selections, modifiers[]
modifier        — name, defaultPriceDelta
menu            — top-level container: categories[] (e.g. "Delivery menu", "Lunch menu")
```

These are plain documents; no hierarchy fields. They are the single source of truth (content-reuse: full-reference end of the spectrum).

### 6.2 Hierarchy / scope types

```
market   — name, code (US, UK...), languages, currency
region   — name, parent: reference → market (optional finer grain)
store    — storeNumber, name, address/geo, parent: reference → region|market,
           timezone, externalIds (POS/loyalty)
```

One **`parent` reference per document** pointing up (the same shape the PR and Sanity's hierarchy primitive use: children are discovered by querying `*[parent._ref == $id]`, never stored as a children array).

### 6.3 The inheritance carrier: `menuScope` (one per level)

A `menuScope` document binds a hierarchy node (global / market / region / store) to its menu **deltas**:

```ts
defineType({
  name: 'menuScope',
  type: 'document',
  fields: [
    { name: 'scope', type: 'reference', to: [{type: 'market'}, {type: 'region'}, {type: 'store'}] },
      // absent ⇒ this is the global scope
    { name: 'parentScope', type: 'reference', to: [{type: 'menuScope'}] },
      // absent ⇒ root (global)
    { name: 'addedCategories', type: 'array', of: [{type: 'reference', to: [{type: 'menuCategory'}]}] },
    { name: 'addedItems', type: 'array', of: [{type: 'reference', to: [{type: 'menuItem'}]}] },
    { name: 'removedItems', type: 'array', of: [{type: 'reference', to: [{type: 'menuItem'}]}] },
      // exclusion list — the PR's `removedLinks` tombstone pattern
    { name: 'itemOverrides', type: 'array', of: [{type: 'itemOverride'}] },
  ],
})

// itemOverride (object): which item + which fields are overridden at this level
{
  item: reference → menuItem,
  price?: number,            // most common store-level override
  available?: boolean,       // 86'd
  name?: localeString,       // regional naming
  description?: localeText,
  // every field optional — only set fields override; unset fields inherit
}
```

**Resolution rule (deterministic, bottom-up wins):**

```
effectiveItems(scope) =
  (effectiveItems(parentScope) ∪ scope.addedItems) − scope.removedItems
effectiveField(item, field, scope) =
  scope.itemOverrides[item][field] ?? effectiveField(item, field, parentScope) ?? menuItem[field]
```

A removal at region level can be re-added at store level (the union/difference runs per level, walking down). Depth is fixed at 3–4 levels (global → market → region → store), which keeps GROQ expansion bounded — same constraint the PR's query hardcodes.

## 7. Inheritance Strategy Decision

| | A: Resolve-at-read (deltas + merge) | B: Materialize-at-write (function sync) |
|---|---|---|
| Source of truth | Pristine — each level holds only what it changed | Smeared — children hold copies; "was this overridden or synced?" needs bookkeeping |
| Read cost | Higher: parent-chain expansion + merge per request (mitigated by CDN cache / resolved snapshots) | Trivial: read the child document |
| Write cost | Trivial: edit one document | Fan-out: 1 global edit → patch N regions → N×M stores |
| Scale risk | GROQ depth is fixed (3–4 levels) — fine | **Function rate limits**: 4,000 invocations/project/30s and 200/document/30s; a cascade to ~6,000 stores will throttle. Client v7.12+ caps recursive chains at 16 hops |
| Drafts | Merge can run on `drafts` perspective (the PR's Studio component does) | Functions fire on published events only — draft changes don't propagate |
| Audit | Each level's deltas are its audit trail | History is mutation noise from the sync bot |

**Decision: Strategy A (resolve-at-read) is the system of record.** Deltas-only storage is the only shape that stays healthy at 6,000 stores; the rate-limit math rules out per-store materialization via Functions as the primary mechanism.

**Strategy B is retained for one narrow job:** materializing a **resolved-menu snapshot per store** into a read-optimized place (a `resolvedMenu` document per store, or push to the ordering platform's cache/Vercel) — but triggered as a controlled batch (queue + worker, or scheduled function processing changed scopes in batches) rather than an unbounded event cascade. This gives consumers O(1) reads without making the sync path the source of truth.

## 8. Functional Requirements

### FR-1: Schema & resolution
- 1.1 Schema types per §6, with validation: `parentScope` must be exactly one level above `scope`'s type; no cycles; `removedItems`/`itemOverrides` may only reference items present in the effective parent menu (async validation rule).
- 1.2 A shared GROQ fragment (and TypeGen types) that returns the effective menu for a scope, expanding the parent chain to max depth and returning per-item provenance: `inherited | overridden | local | removed`.
- 1.3 Resolution helper published as a small TS package/function shared by Studio components and the frontend so merge logic exists in exactly one place (the PR currently duplicates merge logic in the Studio component — don't repeat that).

### FR-2: Studio editing experience
- 2.1 **Effective-menu view**: custom field/tool component (evolved from the PR's `CombinedLinks.tsx`) that renders the merged menu at the current scope with provenance badges — *Inherited from Global*, *Overridden here*, *Added here*, *Removed here* — using `useQuery` with `perspective: 'drafts'` so unpublished upstream edits are visible.
- 2.2 Inline actions on each effective item: **Override price**, **Hide at this level** (adds to `removedItems`), **Revert to inherited** (deletes the override entry).
- 2.3 **"Create child scope" document action** (productionized `CreateChildAction` from the PR): from a market scope, scaffold region/store scopes with `parentScope` pre-wired; use proper UUIDs (`crypto.randomUUID`, not lodash `uniqueId`) and initial value templates.
- 2.4 Structure: workspace per market (markets-repo pattern). Inside a workspace: Global (read-only reference) → My market scope → regions → stores, stores grouped/searchable by store number. Store operators land directly on their store's scope document.
- 2.5 Guardrails: `removedItems` and `itemOverrides` arrays are hidden in favor of the effective view's inline actions (raw arrays available behind a "developer" view for debugging).

### FR-3: Permissions
- 3.1 Roles: `global-menu-admin` (all types), `market-manager` (menuScope documents whose `scope` is in their market — enforced via content resource permissions / dataset-per-market if needed), `store-operator` (only their store's `menuScope`, and only `itemOverrides.price`, `itemOverrides.available`, store-local additions).
- 3.2 Canonical `menuItem`/`menuCategory` are read-only for everyone except global admins.
- 3.3 Decision needed (see §12): single dataset with document-level permissions vs. the existing markets pattern. Single dataset strongly preferred — cross-dataset references don't exist, and inheritance requires references across levels.

### FR-4: Delivery (frontend/API)
- 4.1 One query (or one endpoint wrapping it) returns the resolved menu for a store ID, suitable for the ordering app: categories → items with effective price/availability/locale strings.
- 4.2 Served via Sanity CDN with tag-based revalidation; target p95 < 300ms cached.
- 4.3 Optional v1.5: per-store `resolvedMenu` snapshot materialized by the batch sync (§7) for the ordering platform's bulk consumption, with `sku/plu` keys for POS reconciliation.

### FR-5: Propagation & lifecycle
- 5.1 Publishing a global/regional change is immediately reflected in all descendant effective menus (automatic with resolve-at-read — this is the point of Strategy A).
- 5.2 Content Releases used for coordinated launches ("Summer menu goes live in all US stores on July 1") — releases work naturally here because only the canonical docs and a few scope docs change, not 6,000 documents.
- 5.3 Deleting a canonical `menuItem` is blocked while any scope references it (Sanity's reference integrity gives us this for free with strong references — keep them strong).
- 5.4 Orphan handling: deleting a scope requires re-parenting or deleting child scopes first (mirrors the hierarchy primitive's no-cascade-delete rule).

### FR-6: Observability & audit
- 6.1 "Where is this item overridden?" — reverse lookup view on `menuItem`: all scopes that override or remove it (`*[_type == "menuScope" && (references($itemId))]` with provenance).
- 6.2 Standard document history covers per-level audit since each level only ever edits its own deltas.

## 9. Technical Design Notes

- **GROQ resolution (bounded depth, the PR's shape generalized):** expand `parentScope->{..., parentScope->{..., parentScope->{...}}}` to depth 4; merge in the shared helper. Never recurse unboundedly; validation in FR-1.1 keeps real depth ≤ 4.
- **Why not the Content Lake hierarchy primitive (`sanity.tree`/`sanity.directory`/`parent`)?** It's in public beta and models *containment* (folders), not *inheritance with overrides*. We mirror its sound conventions (single `parent` ref, query-children-don't-store-them, no cascade delete) but on our own types. Revisit at GA.
- **Functions hygiene** (for the snapshot sync): filter must exclude mutations made by the sync's own token (check `event` author or use a dedicated robot token and skip its mutations) to avoid recursion; batch child patches in transactions of ≤ 100; respect 4,000 inv/30s by queueing.
- **Diffing:** the PR diffs array members by `_key` — fine for additions, but `_key` is per-document; when copying entries between documents, regenerate `_key`s and compare by `_ref` instead.
- **Perspectives:** Studio effective view reads `drafts`; delivery reads `published`. Make the perspective an explicit parameter of the shared resolver.

## 10. Rollout Plan

| Phase | Scope |
|---|---|
| **P0 — Spike (1–2 wks)** | Fork the PR's patterns into a Papa Johns PoC: `menuScope` with deltas + overrides, effective-menu Studio component, resolver package, 1 market / 2 regions / 10 fake stores. Validate editor UX with the PJ content team. |
| **P1 — Core (3–4 wks)** | Full schema, validation, workspaces, roles, Create-child action, delivery query + TypeGen, seed US market. |
| **P2 — Scale & integrate** | Store onboarding tooling (bulk-create scopes from store master data), snapshot sync for ordering platform, POS price/availability ingestion writing `itemOverrides` via API, Content Releases workflow. |
| **P3 — Global** | Remaining markets, localization per market, franchisee role hardening. |

## 11. Success Metrics

- Global menu change reaches every store's effective menu in < 1 min (read path) / < 15 min (materialized snapshots).
- Zero duplicated canonical item content (audit: no two `menuItem` docs share a `sku`).
- Store operator can change a price or 86 an item in < 30 seconds, ≤ 3 clicks from login.
- p95 resolved-menu fetch < 300ms (CDN-cached).
- < 1% of stores carrying overrides on fields they shouldn't (indicates permission model working).

## 12. Open Questions

1. **Dataset topology**: single dataset + document permissions vs. workspace-per-market on one dataset (markets-repo default) vs. dataset-per-market (breaks cross-level references — likely a no). Needs a permissions spike with real PJ org structure.
2. How many hierarchy levels does PJ actually need? (Global → Market → Store may suffice; Region only if pricing zones demand it. Fewer levels = simpler resolution.)
3. Is price authored in Sanity or mastered in POS/pricing systems and only *displayed* via Sanity? If mastered externally, `itemOverrides.price` becomes an integration-written field (read-only in Studio).
4. Franchisee licensing/seat model for ~6,000 store operators — Studio seats vs. a lightweight custom app (App SDK) for the two store-level operations (price, availability).
5. Modifier-level overrides (regional topping prices) — in v1 or deferred?

## 13. References

- **Reference implementation:** [jjburbridge/markets PR #2 — Hierarchy and inheritance](https://github.com/jjburbridge/markets/pull/2) (both strategies, Studio component, document action, blueprint-registered function)
- **Base repo:** [jjburbridge/markets](https://github.com/jjburbridge/markets) — multi-market workspace Studio with document-internationalization
- [Sanity Functions intro](https://www.sanity.io/docs/functions/functions-introduction) · [Functions rate limits](https://www.sanity.io/docs/help/functions-rate-limit)
- [Content Lake hierarchy primitive (beta)](https://www.sanity.io/docs/content-lake/hierarchy) — containment conventions, not used directly in v1
- Content modeling: deltas/exclusion lists are the "shared components + taxonomy reference" end of the content-reuse spectrum; avoid over-materialization (duplication anti-pattern)
