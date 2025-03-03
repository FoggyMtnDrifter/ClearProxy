// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user?: {
        id: number
        email: string
        name: string
      }
      invalidateAll?: () => void
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
    // interface Session {}
    // interface Stuff {}
  }
}

export {}
