declare global {
  namespace App {
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
