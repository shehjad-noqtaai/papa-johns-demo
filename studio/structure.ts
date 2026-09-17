import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {PinIcon} from '@sanity/icons/Pin'
import {StackCompactIcon} from '@sanity/icons/StackCompact'
import type {DefaultDocumentNodeResolver, StructureResolver} from 'sanity/structure'

import {EffectiveMenuView} from './components/EffectiveMenuView'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Menu management')
    .items([
      S.listItem()
        .title('Global menu')
        .icon(StackCompactIcon)
        .child(
          S.documentList()
            .title('Global menu scope')
            .apiVersion('2025-05-08')
            .filter('_type == "menuScope" && level == "global"'),
        ),
      S.listItem()
        .title('Market menus')
        .icon(EarthGlobeIcon)
        .child(
          S.documentList()
            .title('Market scopes')
            .apiVersion('2025-05-08')
            .filter('_type == "menuScope" && level == "market"'),
        ),
      S.listItem()
        .title('Store menus')
        .icon(PinIcon)
        .child(
          S.documentList()
            .title('Store scopes')
            .apiVersion('2025-05-08')
            .filter('_type == "menuScope" && level == "store"'),
        ),
      S.divider(),
      S.documentTypeListItem('menuItem').title('Menu items (canonical)'),
      S.documentTypeListItem('menuCategory').title('Categories'),
      S.divider(),
      S.documentTypeListItem('market').title('Markets'),
      S.documentTypeListItem('store').title('Stores'),
      S.divider(),
      S.listItem()
        .title('Footer')
        .icon(BlockElementIcon)
        .child(
          S.document().schemaType('footer').documentId('footer').title('Footer'),
        ),
    ])

export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, {schemaType}) => {
  if (schemaType === 'menuScope') {
    return S.document().views([
      S.view.form(),
      S.view.component(EffectiveMenuView).title('Effective menu'),
    ])
  }
  return S.document()
}
