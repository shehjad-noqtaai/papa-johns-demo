import {sanityClient, footerQuery, type FooterData, type FooterLink} from '@/lib/sanity'

/** Phase 1 icon paths are site-relative to papajohns.com */
const absoluteUrl = (path: string) =>
  path.startsWith('http') ? path : `https://www.papajohns.com${path}`

function LinkColumn({title, links}: {title: string; links: FooterLink[]}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.label + link.url}>
            <a
              href={link.url}
              className="text-sm text-zinc-300 transition hover:text-white hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LocationList({title, links}: {title: string; links: FooterLink[]}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {links.map((link) => (
          <li key={link.label + link.url}>
            <a
              href={link.url}
              className="text-xs text-zinc-400 transition hover:text-white hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function Footer() {
  const footer = await sanityClient.fetch<FooterData | null>(footerQuery)

  if (!footer) return null

  return (
    <footer className="mt-16 bg-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <LinkColumn title={footer.companyLinksTitle} links={footer.companyLinks} />
          <LinkColumn title={footer.pizzaLinksTitle} links={footer.pizzaLinks} />
          <LinkColumn title={footer.helpLinksTitle} links={footer.helpLinks} />
          <div>
            {footer.socialLinksTitle && (
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                {footer.socialLinksTitle}
              </h3>
            )}
            <ul className="mt-4 flex gap-3">
              {footer.socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.url}
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 transition hover:bg-red-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={absoluteUrl(social.icon)}
                      alt=""
                      className="h-4 w-4 brightness-0 invert"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 space-y-6 border-t border-zinc-700 pt-8">
          <LocationList title={footer.usLocationsTitle} links={footer.usLocations} />
          <LocationList title={footer.caLocationsTitle} links={footer.caLocations} />
        </div>

        <div className="mt-10 border-t border-zinc-700 pt-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {footer.legalLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.url}
                  className="text-xs font-semibold text-zinc-300 transition hover:text-white hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div
            className="footer-disclaimer mt-6 text-xs leading-relaxed text-zinc-500"
            dangerouslySetInnerHTML={{__html: footer.disclaimerText}}
          />
        </div>
      </div>
    </footer>
  )
}
