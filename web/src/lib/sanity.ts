import {createClient} from '@sanity/client'

/**
 * Server-side Sanity client. Reads published content only — the Studio's
 * "Effective menu" view is the place for previewing drafts.
 */
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2025-05-08',
  perspective: 'published',
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
})

export interface ScopeMeta {
  _id: string
  title: string
  level: 'global' | 'market' | 'store'
  currency: string
}

export const scopeListQuery = `*[_type == "menuScope"] | order(level asc, title asc){
  _id,
  title,
  level,
  "currency": coalesce(scope->currency, scope->market->currency, "USD")
}`

export const scopeMetaQuery = `*[_type == "menuScope" && _id == $id][0]{
  _id,
  title,
  level,
  "currency": coalesce(scope->currency, scope->market->currency, "USD")
}`
