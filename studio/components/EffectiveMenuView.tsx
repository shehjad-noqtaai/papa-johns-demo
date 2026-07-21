import {Badge, Box, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useEffect, useMemo, useState} from 'react'
import {getPublishedId, useClient} from 'sanity'
import type {UserViewComponent} from 'sanity/structure'

import {
  resolveEffectiveMenu,
  scopeChainQuery,
  type EffectiveRow,
  type ScopeNode,
} from '../lib/resolveMenu'

const STATUS_BADGE: Record<
  EffectiveRow['status'],
  {label: string; tone: 'default' | 'positive' | 'caution' | 'critical'}
> = {
  inherited: {label: 'Inherited', tone: 'default'},
  local: {label: 'Added here', tone: 'positive'},
  overridden: {label: 'Overridden here', tone: 'caution'},
  removed: {label: 'Removed here', tone: 'critical'},
}

/**
 * Document view for menuScope: renders the RESOLVED menu at this level by
 * walking the parentScope chain (drafts perspective, so unpublished
 * upstream edits are visible too).
 */
export const EffectiveMenuView: UserViewComponent = (props) => {
  const displayed = props.document.displayed
  const client = useClient({apiVersion: '2025-05-08'})
  const draftsClient = useMemo(() => client.withConfig({perspective: 'drafts'}), [client])

  const publishedId = displayed?._id ? getPublishedId(displayed._id) : undefined
  const rev = displayed?._rev

  const [rows, setRows] = useState<EffectiveRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!publishedId) return
    let cancelled = false
    draftsClient
      .fetch<ScopeNode | null>(scopeChainQuery, {id: publishedId})
      .then((leaf) => {
        if (cancelled) return
        setError(null)
        setRows(leaf ? resolveEffectiveMenu(leaf) : [])
      })
      .catch((err) => !cancelled && setError(String(err?.message || err)))
    return () => {
      cancelled = true
    }
  }, [draftsClient, publishedId, rev])

  if (error) {
    return (
      <Card padding={4} tone="critical">
        <Text size={1}>Could not resolve the menu: {error}</Text>
      </Card>
    )
  }

  if (!rows) {
    return (
      <Flex align="center" justify="center" padding={6}>
        <Spinner muted />
      </Flex>
    )
  }

  const byCategory = new Map<string, EffectiveRow[]>()
  for (const row of rows) {
    const key = row.category?.name ?? 'Uncategorized'
    byCategory.set(key, [...(byCategory.get(key) ?? []), row])
  }

  return (
    <Box padding={4}>
      <Stack space={5}>
        <Card padding={3} radius={2} tone="primary">
          <Text size={1} muted>
            Resolved menu for <strong>{displayed?.title as string}</strong> — global menu plus every
            change down the inheritance chain, including unpublished drafts. Items removed at this
            level stay listed (struck through) so they can be re-added.
          </Text>
        </Card>

        {rows.length === 0 && (
          <Card padding={4} radius={2} border>
            <Text size={1} muted>
              Nothing on the menu yet. Add items here or set a parent scope to inherit from.
            </Text>
          </Card>
        )}

        {[...byCategory.entries()].map(([category, items]) => (
          <Stack key={category} space={3}>
            <Text size={1} weight="semibold" muted>
              {category.toUpperCase()}
            </Text>
            <Card radius={2} border>
              <Stack>
                {items.map((row, index) => {
                  const struck = row.status === 'removed'
                  return (
                    <Card
                      key={row.itemId}
                      padding={3}
                      borderTop={index > 0}
                      tone={struck ? 'critical' : 'default'}
                    >
                      <Flex align="center" gap={3}>
                        <Box flex={1}>
                          <Stack space={2}>
                            <Text size={2} style={struck ? {textDecoration: 'line-through'} : undefined}>
                              {row.name}
                              {row.name !== row.canonicalName && (
                                <span style={{opacity: 0.5}}> (canonical: {row.canonicalName})</span>
                              )}
                            </Text>
                            <Text size={1} muted>
                              {row.sku} · from {row.addedBy}
                              {row.overriddenBy.length > 0 && ` · overridden by ${row.overriddenBy.join(', ')}`}
                            </Text>
                          </Stack>
                        </Box>
                        {row.available === false && <Badge tone="critical">86'd</Badge>}
                        <Badge tone={STATUS_BADGE[row.status].tone}>{STATUS_BADGE[row.status].label}</Badge>
                        <Box style={{minWidth: 64, textAlign: 'right'}}>
                          <Text size={2} weight="semibold">
                            {row.price != null ? row.price.toFixed(2) : '—'}
                          </Text>
                        </Box>
                      </Flex>
                    </Card>
                  )
                })}
              </Stack>
            </Card>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}
