import { getUserFromSession } from '$lib/auth/session'
import type { LayoutServerLoad } from './$types'

export const load = (async (event) => {
  const user = await getUserFromSession(event)
  return {
    user
  }
}) satisfies LayoutServerLoad
