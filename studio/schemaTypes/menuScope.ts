import {StackCompactIcon} from '@sanity/icons/StackCompact'
import {defineArrayMember, defineField, defineType} from 'sanity'

const LEVELS = ['global', 'market', 'store'] as const
const PARENT_LEVEL: Record<string, string> = {market: 'global', store: 'market'}

/**
 * The inheritance carrier. One menuScope per hierarchy node
 * (global → market → store). Each scope stores only its DELTAS:
 * items it adds, items it removes, and field-level overrides.
 * The effective menu is resolved by walking the parentScope chain
 * (see lib/resolveMenu.ts and the "Effective menu" document view).
 */
export const menuScope = defineType({
  name: 'menuScope',
  title: 'Menu Scope',
  type: 'document',
  icon: StackCompactIcon,
  fieldsets: [
    {
      name: 'deltas',
      title: 'Menu changes at this level',
      description:
        'Only the differences from the parent scope are stored here. See the "Effective menu" tab for the resolved result.',
      options: {collapsed: false},
    },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'level',
      type: 'string',
      options: {
        list: LEVELS.map((level) => ({title: level, value: level})),
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'scope',
      description: 'The market or store this scope belongs to',
      type: 'reference',
      to: [{type: 'market'}, {type: 'store'}],
      hidden: ({document}) => document?.level === 'global',
      options: {
        filter: ({document}) =>
          document?.level === 'store' ? {filter: '_type == "store"'} : {filter: '_type == "market"'},
      },
      validation: (rule) =>
        rule.custom((value, context) => {
          const level = context.document?.level
          if (level && level !== 'global' && !value) return `A ${level} scope must reference its ${level}`
          if (level === 'global' && value) return 'A global scope must not reference a market or store'
          return true
        }),
    }),
    defineField({
      name: 'parentScope',
      type: 'reference',
      to: [{type: 'menuScope'}],
      hidden: ({document}) => document?.level === 'global',
      options: {
        filter: ({document}) => ({
          filter: 'level == $parentLevel && _id != $self',
          params: {
            parentLevel: PARENT_LEVEL[String(document?.level)] ?? 'global',
            self: String(document?._id).replace(/^drafts\./, ''),
          },
        }),
      },
      validation: (rule) =>
        rule.custom(async (value, context) => {
          const level = context.document?.level as string | undefined
          if (level === 'global') {
            return value ? 'The global scope has no parent' : true
          }
          if (!value?._ref) return 'Required — every market/store scope inherits from a parent scope'
          const client = context.getClient({apiVersion: '2025-05-08'})
          const parentLevel = await client.fetch<string | null>(
            `*[_id == $id][0].level`,
            {id: value._ref},
          )
          const expected = PARENT_LEVEL[String(level)]
          if (parentLevel && expected && parentLevel !== expected) {
            return `A ${level} scope must inherit from a ${expected} scope (selected parent is "${parentLevel}")`
          }
          return true
        }),
    }),
    defineField({
      name: 'addedItems',
      description: 'Items introduced at this level (and inherited by levels below)',
      type: 'array',
      fieldset: 'deltas',
      of: [defineArrayMember({type: 'reference', to: [{type: 'menuItem'}]})],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'removedItems',
      description:
        'Inherited items hidden from this level down (exclusion list). A child scope can re-add them.',
      type: 'array',
      fieldset: 'deltas',
      of: [defineArrayMember({type: 'reference', to: [{type: 'menuItem'}]})],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'itemOverrides',
      description: 'Field-level overrides for inherited items. Unset fields keep the inherited value.',
      type: 'array',
      fieldset: 'deltas',
      of: [defineArrayMember({type: 'itemOverride'})],
    }),
  ],
  preview: {
    select: {title: 'title', level: 'level'},
    prepare({title, level}) {
      return {title, subtitle: level ? `${level} scope` : undefined}
    },
  },
})
