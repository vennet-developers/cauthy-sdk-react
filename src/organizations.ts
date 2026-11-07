// The signed-in person's organizations, with what their role lets them do,
// kept current: every change made through this hook asks for the list again.
//
//   const { organizations, loading, rename } = useOrganizations()

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthError, OrganizationSeat, OrganizationsClient } from '@cauthyhq/js'
import { useAuth, useRequestOutcome } from './react'

export interface UseOrganizations extends OrganizationsClient {
  /** The person's organizations; empty while loading or signed out. */
  organizations: OrganizationSeat[]
  loading: boolean
  /** Why the last list could not be had, or null: an empty list with no error is a person in no organization. */
  error: AuthError | null
  /** Asks for the list again. */
  reload(): Promise<void>
}

export function useOrganizations(options: { system?: string } = {}): UseOrganizations {
  const auth = useAuth()
  const client = auth.organizations
  const who = auth.session?.user.id ?? null
  const system = options.system
  const [list, setList] = useState<OrganizationSeat[]>([])
  const [loading, setLoading] = useState(who !== null)
  const [error, setError] = useState<AuthError | null>(null)
  const outcome = useRequestOutcome()
  // A later ask wins over an earlier one still on its way.
  const asked = useRef(0)

  const reload = useCallback(async () => {
    const n = ++asked.current
    if (who === null) {
      setList([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { value: seats, error: failed } = await outcome('/me/organizations', () => client.list(system))
    if (n !== asked.current) return
    setList(seats)
    setError(failed)
    setLoading(false)
  }, [client, who, system, outcome])

  useEffect(() => {
    void reload()
  }, [reload])

  return useMemo<UseOrganizations>(() => {
    const after = async <R,>(running: Promise<R>): Promise<R> => {
      const r = await running
      await reload()
      return r
    }
    return {
      ...client,
      organizations: list,
      loading,
      error,
      reload,
      add: (id, f) => after(client.add(id, f)),
      setRole: (id, userId, role) => after(client.setRole(id, userId, role)),
      remove: (id, userId) => after(client.remove(id, userId)),
      rename: (id, name) => after(client.rename(id, name)),
      archive: (id) => after(client.archive(id)),
      delete: (id) => after(client.delete(id)),
    }
  }, [client, list, loading, error, reload])
}
