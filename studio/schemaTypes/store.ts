import {PinIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const store = defineType({
  name: 'store',
  title: 'Store',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'storeNumber',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      type: 'string',
      description: 'Location name, e.g. "Hoboken, NJ — Washington St"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'market',
      type: 'reference',
      to: [{type: 'market'}],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'name', storeNumber: 'storeNumber', market: 'market.code'},
    prepare({title, storeNumber, market}) {
      return {title: `#${storeNumber} — ${title}`, subtitle: market}
    },
  },
})
