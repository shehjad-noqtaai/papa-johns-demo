import Link from 'next/link'

import {sanityClient, scopeListQuery, type ScopeMeta} from '@/lib/sanity'

export const dynamic = 'force-dynamic'

const LEVEL_LABEL: Record<ScopeMeta['level'], string> = {
  global: 'Global',
  market: 'Market',
  store: 'Store',
}

const LEVEL_STYLE: Record<ScopeMeta['level'], string> = {
  global: 'bg-zinc-900 text-white',
  market: 'bg-red-700 text-white',
  store: 'bg-red-100 text-red-800',
}

export default async function HomePage() {
  const scopes = await sanityClient.fetch<ScopeMeta[]>(scopeListQuery)

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-red-700">
          Papa Johns demo
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">One menu, every level</h1>
        <p className="mt-3 text-zinc-600">
          Each page below renders the <em>resolved</em> menu for one scope in the hierarchy —
          the global menu plus every market and store change inherited down the chain. Edit a
          scope in the Studio and refresh: only deltas are stored, everything else is inherited.
        </p>
      </header>

      <ul className="space-y-3">
        {scopes.map((scope) => (
          <li key={scope._id}>
            <Link
              href={`/menu/${scope._id}`}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-red-300 hover:shadow"
            >
              <div>
                <div className="font-semibold">{scope.title}</div>
                <div className="text-sm text-zinc-500">Priced in {scope.currency}</div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_STYLE[scope.level]}`}
              >
                {LEVEL_LABEL[scope.level]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
