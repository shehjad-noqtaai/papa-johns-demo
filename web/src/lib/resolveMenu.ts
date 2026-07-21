/**
 * Shared inheritance resolver — the ONE place the merge semantics live.
 * Used by the Studio's "Effective menu" view; a frontend would import the
 * same module (or its compiled equivalent) so Studio and delivery agree.
 *
 * Resolution rule (per level, walking root → leaf):
 *   effective = (inherited ∪ addedItems) − removedItems, then apply itemOverrides
 * A removal only affects the level that removed it and below; a deeper
 * level can re-add the item.
 */

export interface ResolvedItem {
  _id: string
  name: string
  defaultPrice?: number
  sku?: string
  description?: string
  category?: {name?: string; order?: number}
}

export interface ScopeNode {
  _id: string
  title: string
  level: 'global' | 'market' | 'store'
  addedItems?: (ResolvedItem | null)[]
  removedItems?: ({_id: string; name?: string} | null)[]
  itemOverrides?: ({
    item?: {_id: string; name?: string} | null
    price?: number
    available?: boolean
    nameOverride?: string
  } | null)[]
  parentScope?: ScopeNode | null
}

export type Provenance = 'local' | 'inherited' | 'overridden' | 'removed'

export interface EffectiveRow {
  itemId: string
  name: string
  canonicalName: string
  price?: number
  available: boolean
  sku?: string
  category?: {name?: string; order?: number}
  /** Title of the scope that introduced the item */
  addedBy: string
  /** Titles of scopes that override fields, outermost first */
  overriddenBy: string[]
  /** Set when the CURRENT scope removes the item (shown struck-through) */
  removedBy?: string
  status: Provenance
}

const MAX_DEPTH = 4

const scopeFields = `
  _id,
  title,
  level,
  "addedItems": addedItems[]->{_id, name, defaultPrice, sku, description, "category": category->{name, order}},
  "removedItems": removedItems[]->{_id, name},
  "itemOverrides": itemOverrides[]{price, available, nameOverride, "item": item->{_id, name}}
`

function scopeProjection(depth: number): string {
  if (depth <= 0) return `{${scopeFields}}`
  return `{${scopeFields}, "parentScope": parentScope->${scopeProjection(depth - 1)}}`
}

/** Fetches the scope and its ancestor chain, bounded at MAX_DEPTH levels. */
export const scopeChainQuery = `*[_type == "menuScope" && _id == $id][0]${scopeProjection(MAX_DEPTH - 1)}`

/** Flattens the nested parentScope chain into root-first order. */
export function chainRootFirst(leaf: ScopeNode): ScopeNode[] {
  const chain: ScopeNode[] = []
  let node: ScopeNode | null | undefined = leaf
  let depth = 0
  while (node && depth < MAX_DEPTH) {
    chain.unshift(node)
    node = node.parentScope
    depth++
  }
  return chain
}

export function resolveEffectiveMenu(leaf: ScopeNode): EffectiveRow[] {
  const chain = chainRootFirst(leaf)
  const current = chain[chain.length - 1]
  const rows = new Map<string, EffectiveRow>()

  for (const scope of chain) {
    const isCurrent = scope._id === current._id

    // Removals first: they act on what was inherited into this level.
    for (const removed of scope.removedItems ?? []) {
      if (!removed?._id) continue
      const row = rows.get(removed._id)
      if (!row) continue
      if (isCurrent) {
        // Keep visible at the editing level so editors see what they removed.
        row.status = 'removed'
        row.removedBy = scope.title
      } else {
        rows.delete(removed._id)
      }
    }

    // Additions (re-adding something removed upstream resurrects it here).
    for (const item of scope.addedItems ?? []) {
      if (!item?._id) continue
      rows.set(item._id, {
        itemId: item._id,
        name: item.name,
        canonicalName: item.name,
        price: item.defaultPrice,
        available: true,
        sku: item.sku,
        category: item.category,
        addedBy: scope.title,
        overriddenBy: [],
        status: isCurrent ? 'local' : 'inherited',
      })
    }

    // Field overrides: only set fields shadow inherited values; last (deepest) wins.
    for (const override of scope.itemOverrides ?? []) {
      const itemId = override?.item?._id
      const row = itemId ? rows.get(itemId) : undefined
      if (!override || !row || row.status === 'removed') continue
      if (override.price != null) row.price = override.price
      if (override.available != null) row.available = override.available
      if (override.nameOverride) row.name = override.nameOverride
      row.overriddenBy.push(scope.title)
      if (isCurrent && row.status === 'inherited') row.status = 'overridden'
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      (a.category?.order ?? 999) - (b.category?.order ?? 999) ||
      a.canonicalName.localeCompare(b.canonicalName),
  )
}
