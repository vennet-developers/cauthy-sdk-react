// The props of 0.42's components and the shape of its hooks assign to ours:
// moving from `cauthy-auth/react` is an import change.
import type { ComponentProps } from 'react'
import type * as Old from 'cauthy-auth/react'
import type * as New from '../src/index'

export const signIn: ComponentProps<typeof New.SignIn> = {} as ComponentProps<typeof Old.SignIn>
export const signUp: ComponentProps<typeof New.SignUp> = {} as ComponentProps<typeof Old.SignUp>
export const account: ComponentProps<typeof New.Account> = {} as ComponentProps<typeof Old.Account>
export const members: ComponentProps<typeof New.OrganizationMembers> = {} as ComponentProps<typeof Old.OrganizationMembers>
export const provider: ComponentProps<typeof New.CauthyProvider> = {} as ComponentProps<typeof Old.CauthyProvider>
export const session: Old.SessionContext = {} as New.SessionContext
export const auth: ReturnType<typeof Old.useAuth> = {} as ReturnType<typeof New.useAuth>
