/**
 * Seeds the demo dataset with a 3-level hierarchy:
 *   Global Menu → US / UK markets → Hoboken / London stores
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seed.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-05-08'})

const ref = (_ref: string) => ({_type: 'reference', _ref})
const itemRef = (_ref: string) => ({_type: 'reference', _ref, _key: _ref})

const docs = [
  // ── Categories ────────────────────────────────────────────────
  {_id: 'category.pizzas', _type: 'menuCategory', name: 'Pizzas', order: 10},
  {_id: 'category.sides', _type: 'menuCategory', name: 'Sides', order: 20},
  {_id: 'category.drinks', _type: 'menuCategory', name: 'Drinks', order: 30},

  // ── Canonical menu items (single source of truth) ─────────────
  {
    _id: 'item.pepperoni',
    _type: 'menuItem',
    name: 'Pepperoni Pizza',
    sku: 'PZ-PEP-001',
    category: ref('category.pizzas'),
    defaultPrice: 14.99,
    description: 'Classic pepperoni with extra mozzarella on our original crust.',
  },
  {
    _id: 'item.margherita',
    _type: 'menuItem',
    name: 'Margherita Pizza',
    sku: 'PZ-MAR-002',
    category: ref('category.pizzas'),
    defaultPrice: 12.99,
    description: 'Tomato, fresh mozzarella and basil.',
    dietary: ['vegetarian'],
  },
  {
    _id: 'item.bbq-chicken',
    _type: 'menuItem',
    name: 'BBQ Chicken Bacon Pizza',
    sku: 'PZ-BBQ-003',
    category: ref('category.pizzas'),
    defaultPrice: 16.99,
    description: 'Grilled chicken, bacon and onions with sweet BBQ sauce.',
  },
  {
    _id: 'item.the-works',
    _type: 'menuItem',
    name: 'The Works Pizza',
    sku: 'PZ-WRK-004',
    category: ref('category.pizzas'),
    defaultPrice: 17.99,
    description: 'Pepperoni, Italian sausage, mushrooms, onions and green peppers.',
  },
  {
    _id: 'item.hotdog-crust',
    _type: 'menuItem',
    name: 'Hot Dog Stuffed Crust Pizza',
    sku: 'PZ-HDC-005',
    category: ref('category.pizzas'),
    defaultPrice: 15.49,
    description: 'A UK favourite — crust stuffed with hot dog sausage, mustard drizzle.',
  },
  {
    _id: 'item.garlic-knots',
    _type: 'menuItem',
    name: 'Garlic Knots',
    sku: 'SD-GKN-101',
    category: ref('category.sides'),
    defaultPrice: 6.49,
    dietary: ['vegetarian'],
  },
  {
    _id: 'item.cheesesticks',
    _type: 'menuItem',
    name: 'Cheesesticks',
    sku: 'SD-CHS-102',
    category: ref('category.sides'),
    defaultPrice: 7.49,
    dietary: ['vegetarian'],
  },
  {
    _id: 'item.pepsi',
    _type: 'menuItem',
    name: 'Pepsi (2L)',
    sku: 'DR-PEP-201',
    category: ref('category.drinks'),
    defaultPrice: 3.49,
  },

  // ── Org hierarchy ─────────────────────────────────────────────
  {_id: 'market.us', _type: 'market', name: 'United States', code: 'US', currency: 'USD'},
  {_id: 'market.uk', _type: 'market', name: 'United Kingdom', code: 'UK', currency: 'GBP'},
  {
    _id: 'store.4421',
    _type: 'store',
    storeNumber: '4421',
    name: 'Hoboken, NJ — Washington St',
    market: ref('market.us'),
  },
  {
    _id: 'store.0102',
    _type: 'store',
    storeNumber: '0102',
    name: 'London — Soho',
    market: ref('market.uk'),
  },

  // ── Menu scopes (the deltas) ──────────────────────────────────
  // Global: the canonical menu line-up.
  {
    _id: 'scope.global',
    _type: 'menuScope',
    title: 'Global Menu',
    level: 'global',
    addedItems: [
      itemRef('item.pepperoni'),
      itemRef('item.margherita'),
      itemRef('item.bbq-chicken'),
      itemRef('item.garlic-knots'),
      itemRef('item.cheesesticks'),
      itemRef('item.pepsi'),
    ],
  },
  // US market: adds a US-only pizza.
  {
    _id: 'scope.market-us',
    _type: 'menuScope',
    title: 'United States',
    level: 'market',
    scope: ref('market.us'),
    parentScope: ref('scope.global'),
    addedItems: [itemRef('item.the-works')],
  },
  // UK market: drops BBQ chicken, adds the stuffed-crust, GBP pricing,
  // regional rename of cheesesticks.
  {
    _id: 'scope.market-uk',
    _type: 'menuScope',
    title: 'United Kingdom',
    level: 'market',
    scope: ref('market.uk'),
    parentScope: ref('scope.global'),
    addedItems: [itemRef('item.hotdog-crust')],
    removedItems: [itemRef('item.bbq-chicken')],
    itemOverrides: [
      {_type: 'itemOverride', _key: 'ov-margherita', item: ref('item.margherita'), price: 10.99},
      {
        _type: 'itemOverride',
        _key: 'ov-cheesesticks',
        item: ref('item.cheesesticks'),
        nameOverride: 'Cheese & Garlic Sticks',
        price: 5.99,
      },
    ],
  },
  // Hoboken store: metro pricing on pepperoni, garlic knots 86'd.
  {
    _id: 'scope.store-4421',
    _type: 'menuScope',
    title: 'Store #4421 — Hoboken, NJ',
    level: 'store',
    scope: ref('store.4421'),
    parentScope: ref('scope.market-us'),
    itemOverrides: [
      {_type: 'itemOverride', _key: 'ov-pepperoni', item: ref('item.pepperoni'), price: 16.49},
      {_type: 'itemOverride', _key: 'ov-knots', item: ref('item.garlic-knots'), available: false},
    ],
  },
  // London store: re-adds BBQ chicken (removed at UK level) — demos
  // that a deeper level can resurrect an upstream removal.
  {
    _id: 'scope.store-0102',
    _type: 'menuScope',
    title: 'Store #0102 — London Soho',
    level: 'store',
    scope: ref('store.0102'),
    parentScope: ref('scope.market-uk'),
    addedItems: [itemRef('item.bbq-chicken')],
    itemOverrides: [
      {_type: 'itemOverride', _key: 'ov-bbq', item: ref('item.bbq-chicken'), price: 14.49},
    ],
  },
]

async function seed() {
  const transaction = docs.reduce(
    (trx, doc) => trx.createOrReplace(doc as never),
    client.transaction(),
  )
  await transaction.commit()
  console.log(`Seeded ${docs.length} published documents into ${client.config().projectId}/${client.config().dataset}`)
}

seed().catch((err) => {
  console.error(err)
  throw err
})
