import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'

import {CreateChildScopeAction} from './actions/createChildScope'
import {schemaTypes} from './schemaTypes'
import {defaultDocumentNode, structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'Papa Johns — Menu Hierarchy',

  projectId: 'oko9i2hs',
  dataset: 'production',

  plugins: [structureTool({structure, defaultDocumentNode}), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'menuScope') return [CreateChildScopeAction, ...prev]
      if (context.schemaType === 'footer') {
        // Singleton: no duplicate/delete/unpublish — one footer per dataset
        return prev.filter(
          ({action}) => !['duplicate', 'delete', 'unpublish'].includes(action ?? ''),
        )
      }
      return prev
    },
    // Keep the footer singleton out of the global "create new document" menu
    newDocumentOptions: (prev) => prev.filter((template) => template.templateId !== 'footer'),
  },
})
