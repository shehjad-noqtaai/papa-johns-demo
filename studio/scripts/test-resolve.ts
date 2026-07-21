/**
 * Smoke test for the inheritance resolver: runs the exact query + merge
 * the "Effective menu" view uses, for both demo stores.
 *
 *   npx sanity exec scripts/test-resolve.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

import {resolveEffectiveMenu, scopeChainQuery, type ScopeNode} from '../lib/resolveMenu'

const client = getCliClient({apiVersion: '2025-05-08'}).withConfig({perspective: 'drafts'})

async function main() {
  for (const id of ['scope.store-4421', 'scope.store-0102']) {
    const leaf = await client.fetch<ScopeNode | null>(scopeChainQuery, {id})
    if (!leaf) throw new Error(`Scope ${id} not found`)
    console.log(`\n=== ${leaf.title} ===`)
    for (const row of resolveEffectiveMenu(leaf)) {
      console.log(
        [
          row.name.padEnd(28),
          String(row.price?.toFixed(2) ?? '—').padStart(6),
          row.status.padEnd(10),
          row.available === false ? "86'd" : '',
          `(from ${row.addedBy}${row.overriddenBy.length ? `, overridden by ${row.overriddenBy.join(', ')}` : ''})`,
        ].join('  '),
      )
    }
  }
}

main().catch((err) => {
  console.error(err)
  throw err
})
