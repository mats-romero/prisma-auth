import { start } from './confirm.js'
import { publicConfig } from './public-config.js'

const take = window.__prismaTakeReturn
delete window.__prismaTakeReturn
const returned = typeof take === 'function' ? take() : { hash: '', search: '' }

start({
  hash: returned.hash,
  search: returned.search,
  config: publicConfig,
  document,
  fetchImpl: globalThis.fetch.bind(globalThis),
})
