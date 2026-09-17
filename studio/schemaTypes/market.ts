import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {defineField, defineType} from 'sanity'

export const market = defineType({
  name: 'market',
  title: 'Market',
  type: 'document',
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'code',
      type: 'string',
      description: 'Market code, e.g. US, UK',
      validation: (rule) => rule.required().uppercase().max(5),
    }),
    defineField({
      name: 'currency',
      type: 'string',
      description: 'ISO 4217 currency code, e.g. USD, GBP',
      validation: (rule) => rule.required().uppercase().length(3),
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'code'},
  },
})
