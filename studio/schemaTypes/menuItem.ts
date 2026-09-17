import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineField, defineType} from 'sanity'

/**
 * Canonical menu item — the single source of truth.
 * Carries the global defaults; regional/store differences live as
 * itemOverrides on menuScope documents, never here.
 */
export const menuItem = defineType({
  name: 'menuItem',
  title: 'Menu Item',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sku',
      title: 'SKU / PLU',
      type: 'string',
      description: 'Key used to reconcile with POS and ordering systems',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{type: 'menuCategory'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'defaultPrice',
      type: 'number',
      description: 'Global default price. Markets and stores override via their menu scope.',
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'dietary',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Vegetarian', value: 'vegetarian'},
          {title: 'Vegan', value: 'vegan'},
          {title: 'Spicy', value: 'spicy'},
          {title: 'Gluten-free crust available', value: 'gluten-free-option'},
        ],
      },
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'sku', category: 'category.name'},
    prepare({title, subtitle, category}) {
      return {title, subtitle: [subtitle, category].filter(Boolean).join(' · ')}
    },
  },
})
