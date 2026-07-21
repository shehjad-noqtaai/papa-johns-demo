/**
 * Find the Media Library container (sanity.asset) for an asset instance
 * that lives in a project dataset, looked up by original filename.
 *
 * Usage (from the studio/ directory):
 *   npx sanity exec scripts/findAssetContainer.ts --with-user-token -- \
 *     --filename "1.15_Wedding_Colors_Hero_Desktop.jpg" \
 *     --project 993d44or \
 *     --dataset staging \
 *     --library <your-ml-id>
 *
 * The library ID ("ml..." ) is in Manage under your organization's Media Library.
 */
import {getCliClient} from 'sanity/cli'

const API_VERSION = '2025-05-06'

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

const filename = getArg('filename')
const projectId = getArg('project')
const dataset = getArg('dataset')
const libraryId = getArg('library')

if (!filename || !projectId || !dataset || !libraryId) {
  console.error('Missing required arguments: --filename, --project, --dataset, --library')
  process.exit(1)
}

async function main() {
  const cliClient = getCliClient({apiVersion: API_VERSION})

  // Step 1: find the asset instance(s) in the project dataset
  const datasetClient = cliClient.withConfig({projectId, dataset, useCdn: false})

  const instances: {_id: string; _type: string; sha1hash: string; url: string}[] =
    await datasetClient.fetch(
      `*[_type in ["sanity.imageAsset", "sanity.fileAsset"] && originalFilename == $filename]{
        _id, _type, sha1hash, url
      }`,
      {filename},
    )

  if (instances.length === 0) {
    console.error(`No asset instance found in ${projectId}/${dataset} for "${filename}"`)
    process.exit(1)
  }

  // Step 2: for each instance, look up the container in the Media Library.
  // Instance IDs are content-addressed, so the dataset copy and the Media
  // Library original share the same _id. Fall back to sha1hash in case the
  // instance was re-uploaded rather than linked.
  const mlClient = cliClient.withConfig({
    projectId: undefined,
    dataset: undefined,
    useCdn: false,
    resource: {type: 'media-library', id: libraryId},
  })

  const containerQuery = `*[_type == "sanity.asset" && references($instanceId)][0]{
    _id, title, url
  }`
  const containerBySha = `*[_type == "sanity.asset" && currentVersion->sha1hash == $sha1hash][0]{
    _id, title, url
  }`

  // The CDN allows an optional, purely cosmetic filename segment after the
  // container ID — slugified from the container title.
  const slugify = (title: string) => {
    const dot = title.lastIndexOf('.')
    const [name, ext] = dot > 0 ? [title.slice(0, dot), title.slice(dot)] : [title, '']
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + ext.toLowerCase()
    )
  }

  for (const instance of instances) {
    const container =
      (await mlClient.fetch(containerQuery, {instanceId: instance._id})) ??
      (await mlClient.fetch(containerBySha, {sha1hash: instance.sha1hash}))

    console.log(`\nInstance:  ${instance._id}`)
    console.log(`  dataset url:   ${instance.url}`)
    if (container) {
      console.log(`Container: ${container._id}`)
      console.log(`  title:         ${container.title}`)
      console.log(`  container url: ${container.url}/${slugify(container.title)}`)
      console.log(`  global ref:    media-library:${libraryId}:${container._id}`)
    } else {
      console.log('Container: not found in Media Library (asset may be a direct dataset upload)')
    }
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
