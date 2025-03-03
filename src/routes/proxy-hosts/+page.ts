import type { PageLoad } from './$types'

export const load = (({ data, depends }) => {
  depends('app:proxy-hosts')
  depends('app:caddy-status')

  return data
}) satisfies PageLoad
