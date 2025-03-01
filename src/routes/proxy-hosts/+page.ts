import type { PageData } from './$types';

export const load = (async ({ data }: { data: PageData }) => {
  return {
    ...data,
    loading: false
  };
}); 