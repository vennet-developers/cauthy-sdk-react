// The sign-in with no ready-made form: the flow of @cauthyhq/js in React's
// terms. The page draws what it likes for each step; the server's `next`
// decides the step.
//
//   const flow = useSignInFlow()
//   if (flow.step.name === 'mfa') return <CodeForm onCode={flow.code} />

import { useMemo, useState, useSyncExternalStore } from 'react'
import { createSignInFlow, type FlowState, type SignInFlow } from '@cauthyhq/js'
import { useAuth } from './react'

export function useSignInFlow(): SignInFlow & FlowState {
  const auth = useAuth()
  // One flow per mounted form. The functions of `auth` are the store's, the
  // same on every render, so the session changing does not restart it.
  const [flow] = useState(() => createSignInFlow(auth))
  const state = useSyncExternalStore(flow.subscribe, flow.get, flow.get)
  return useMemo(() => ({ ...flow, ...state }), [flow, state])
}
