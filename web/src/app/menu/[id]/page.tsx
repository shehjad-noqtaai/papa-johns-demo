import Link from 'next/link'
import {notFound} from 'next/navigation'

import {resolveEffectiveMenu, scopeChainQuery, type EffectiveRow, type ScopeNode} from '@/lib/resolveMenu'
import {sanityClient, scopeMetaQuery, type ScopeMeta} from '@/lib/sanity'

export const dynamic = 'force-dynamic'

function formatPrice(price: number | undefined, currency: string) {
  if (price == null) return '—'
  return new Intl.NumberFormat('en', {style: 'currency', currency}).format(price)
}

function ProvenanceBadge({row}: {row: EffectiveRow}) {
  if (row.status === 'local') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        {row.addedBy} exclusive
      </span>
    )
  }
  if (row.status === 'overridden' || row.overriddenBy.length > 0) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        adjusted by {row.overriddenBy[row.overriddenBy.length - 1]}
      </span>
    )
  }
  return null
}

export default async function MenuPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  const scopeId = decodeURIComponent(id)

  const [meta, leaf] = await Promise.all([
    sanityClient.fetch<ScopeMeta | null>(scopeMetaQuery, {id: scopeId}),
    sanityClient.fetch<ScopeNode | null>(scopeChainQuery, {id: scopeId}),
  ])
  if (!meta || !leaf) notFound()

  // Frontend shows the customer view: removed items are simply gone.
  const rows = resolveEffectiveMenu(leaf).filter((row) => row.status !== 'removed')

  const byCategory = new Map<string, EffectiveRow[]>()
  for (const row of rows) {
    const key = row.category?.name ?? 'More'
    byCategory.set(key, [...(byCategory.get(key) ?? []), row])
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-red-700 hover:underline">
        ← All menus
      </Link>

      <header className="mt-4 mb-10 rounded-2xl bg-zinc-900 px-8 py-10 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
          {meta.level} menu
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{meta.title}</h1>
        <p className="mt-2 text-sm text-zinc-300">
          {rows.length} items · priced in {meta.currency}
        </p>
      </header>

      <div className="space-y-10">
        {[...byCategory.entries()].map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-4 border-b border-zinc-200 pb-2 text-lg font-bold uppercase tracking-wide text-zinc-700">
              {category}
            </h2>
            <ul className="space-y-4">
              {items.map((row) => {
                const soldOut = row.available === false
                return (
                  <li key={row.itemId} className={soldOut ? 'opacity-50' : undefined}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold">{row.name}</span>
                        <ProvenanceBadge row={row} />
                        {soldOut && (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
                            Sold out today
                          </span>
                        )}
                      </div>
                      <span className="whitespace-nowrap font-semibold tabular-nums">
                        {formatPrice(row.price, meta.currency)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <footer className="mt-14 border-t border-zinc-200 pt-6 text-xs text-zinc-400">
        Resolved at request time from delta documents in Sanity — this scope stores only its own
        changes; everything else is inherited from its parent chain.
      </footer>
    </main>
  )
}
