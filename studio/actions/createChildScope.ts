import {AddCircleIcon} from '@sanity/icons/AddCircle'
import {getPublishedId, useClient, type DocumentActionComponent} from 'sanity'
import {useRouter} from 'sanity/router'

const CHILD_LEVEL: Record<string, 'market' | 'store'> = {global: 'market', market: 'store'}

/**
 * "Create child scope" on menuScope documents: scaffolds a new draft one
 * level down with parentScope pre-wired. Unlike the markets-PR PoC (which
 * clones content), the child starts EMPTY — deltas-only is the model.
 */
export const CreateChildScopeAction: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: '2025-05-08'})
  const router = useRouter()

  const doc = (props.draft ?? props.published) as
    | {_id: string; title?: string; level?: string}
    | null

  const childLevel = doc?.level ? CHILD_LEVEL[doc.level] : undefined
  if (!doc || !childLevel) return null // store scopes have no children

  return {
    label: `Create child ${childLevel} scope`,
    icon: AddCircleIcon,
    onHandle: async () => {
      const newId = crypto.randomUUID()
      await client.create({
        _id: `drafts.${newId}`,
        _type: 'menuScope',
        title: `New ${childLevel} scope (under ${doc.title ?? 'untitled'})`,
        level: childLevel,
        parentScope: {_type: 'reference', _ref: getPublishedId(doc._id)},
      })
      props.onComplete()
      router.navigateIntent('edit', {id: newId, type: 'menuScope'})
    },
  }
}
