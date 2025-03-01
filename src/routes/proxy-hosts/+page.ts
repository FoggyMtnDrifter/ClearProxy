import type { PageData } from './$types';

export const load = (async ({ data, depends }: { data: PageData; depends: Function }) => {
  // Mark this load function as dependent on the proxy-hosts data
  depends('app:proxy-hosts');

  return {
    ...data,
    loading: false
  };
}); 