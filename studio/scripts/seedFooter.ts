/**
 * Loads footer-content.json into the Content Lake as the `footer` singleton
 * (fixed _id: "footer") and publishes it.
 *
 * Array items get `_type` (link / socialLink) and a stable `_key` added.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedFooter.ts --with-user-token
 */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-05-08'})

const raw = JSON.parse(
  readFileSync(resolve(__dirname, '../../footer-content.json'), 'utf8'),
)

const keyed = (items: Record<string, unknown>[], type: string, prefix: string) =>
  items.map((item, i) => ({...item, _type: type, _key: `${prefix}-${i}`}))

const footer = {
  ...raw,
  _id: 'footer',
  companyLinks: keyed(raw.companyLinks, 'link', 'company'),
  pizzaLinks: keyed(raw.pizzaLinks, 'link', 'pizza'),
  helpLinks: keyed(raw.helpLinks, 'link', 'help'),
  legalLinks: keyed(raw.legalLinks, 'link', 'legal'),
  usLocations: keyed(raw.usLocations, 'link', 'us'),
  caLocations: keyed(raw.caLocations, 'link', 'ca'),
  socialLinks: keyed(raw.socialLinks, 'socialLink', 'social'),
}

async function run() {
  // createOrReplace on the published ID = load + publish in one step
  await client.transaction().createOrReplace(footer).commit()
  console.log(`Published footer singleton to dataset "${client.config().dataset}"`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
