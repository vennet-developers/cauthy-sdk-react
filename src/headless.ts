// The sign-in with no ready-made form: the flow of @cauthyhq/js in React's
// terms. The page draws what it likes for each step; the server's `next`
// decides the step.
//
//   const flow = useSignInFlow()
//   if (flow.step.name === 'mfa') return <CodeForm onCode={flow.code} />

import { useMemo, useSyncExternalStore } from 'react'
import { createSignInFlow, type FlowState, type SignInFlow } from '@cauthyhq/js'
import { useSessionStore } from './react'

export function useSignInFlow(): SignInFlow & FlowState {
  // One flow per mounted form and store. The store's functions are the same
  // on every render, so the session changing does not restart it; a new store
  // (the provider given another mount point) does.
  const store = useSessionStore()
  const flow = useMemo(() => createSignInFlow(store.auth), [store])
  const state = useSyncExternalStore(flow.subscribe, flow.get, flow.get)
  return useMemo(() => ({ ...flow, ...state }), [flow, state])
}
