import {EditIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * One override entry on a menuScope. Every field except `item` is
 * optional — only set fields shadow the inherited value.
 */
export const itemOverride = defineType({
  name: 'itemOverride',
  title: 'Item Override',
  type: 'object',
  icon: EditIcon,
  fields: [
    defineField({
      name: 'item',
      type: 'reference',
      to: [{type: 'menuItem'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      type: 'number',
      description: 'Overrides the inherited price (in the market currency)',
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: 'available',
      title: 'Available',
      type: 'boolean',
      description: "Turn off to 86 the item at this level (it stays on the menu structure)",
    }),
    defineField({
      name: 'nameOverride',
      type: 'string',
      description: 'Overrides the display name, e.g. regional naming',
    }),
  ],
  preview: {
    select: {name: 'item.name', nameOverride: 'nameOverride', price: 'price', available: 'available'},
    prepare({name, nameOverride, price, available}) {
      const changes = [
        price != null ? `price → ${price}` : null,
        available === false ? "86'd" : null,
        nameOverride ? `name → ${nameOverride}` : null,
      ].filter(Boolean)
      return {title: nameOverride || name || 'Override', subtitle: changes.join(' · ') || 'No changes set'}
    },
  },
})
