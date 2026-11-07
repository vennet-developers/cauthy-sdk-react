import * as old from 'cauthy-auth/react'
import { describe, expect, it } from 'vitest'
import * as ours from '../src/index'

describe('compatibility with cauthy-auth 0.42', () => {
  it('exports every runtime name of cauthy-auth/react, of the same kind', () => {
    for (const [name, value] of Object.entries(old)) {
      expect(ours, name).toHaveProperty(name)
      expect(typeof (ours as Record<string, unknown>)[name], name).toBe(typeof value)
    }
  })

  it('exports what is new in 1.0', () => {
    for (const name of ['UserButton', 'Organizations', 'useOrganizations', 'useSignInFlow', 'createSessionStore', 'createSignInFlow', 'themeFromStackmyth', 'themeVariables']) {
      expect(ours, name).toHaveProperty(name)
    }
  })
})
