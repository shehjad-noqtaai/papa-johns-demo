import {footer} from './footer'
import {itemOverride} from './itemOverride'
import {link} from './link'
import {market} from './market'
import {menuCategory} from './menuCategory'
import {menuItem} from './menuItem'
import {menuScope} from './menuScope'
import {socialLink} from './socialLink'
import {store} from './store'

export const schemaTypes = [
  // Documents
  menuItem,
  menuCategory,
  menuScope,
  market,
  store,
  footer,
  // Objects
  itemOverride,
  link,
  socialLink,
]
