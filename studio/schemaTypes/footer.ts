import {BlockElementIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

const linkArray = (name: string, title?: string) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [defineArrayMember({type: 'link'})],
    validation: (rule) => rule.required().min(1),
  })

export const footer = defineType({
  name: 'footer',
  title: 'Footer',
  type: 'document',
  icon: BlockElementIcon,
  description: 'Singleton — one footer content document per dataset',
  fields: [
    defineField({
      name: 'companyLinksTitle',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    linkArray('companyLinks'),
    defineField({
      name: 'pizzaLinksTitle',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    linkArray('pizzaLinks'),
    defineField({
      name: 'helpLinksTitle',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    linkArray('helpLinks'),
    linkArray('legalLinks'),
    defineField({
      name: 'usLocationsTitle',
      title: 'US locations title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    linkArray('usLocations', 'US locations'),
    defineField({
      name: 'caLocationsTitle',
      title: 'Canada locations title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    linkArray('caLocations', 'Canada locations'),
    defineField({
      name: 'socialLinksTitle',
      type: 'string',
    }),
    defineField({
      name: 'socialLinks',
      type: 'array',
      of: [defineArrayMember({type: 'socialLink'})],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'disclaimerText',
      type: 'text',
      rows: 12,
      description: 'Legal disclaimer — HTML fragments allowed in Phase 1',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({title: 'Footer'}),
  },
})
