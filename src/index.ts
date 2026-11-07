// @cauthyhq/react: Cauthy for React. Hooks over the session store of
// @cauthyhq/js, headless parts, and ready-made ones in a default theme
// (`import '@cauthyhq/react/styles.css'`).

export { CauthyProvider, useAuth, useSession, type CauthyProviderProps, type SessionContext } from './react'
export { useOrganizations, type UseOrganizations } from './organizations'
export { useSignInFlow } from './headless'
export { initialsOf, UserButton, type UserButtonProps, type UserButtonTexts } from './user-button'
export { Organizations, type OrganizationsProps } from './organizations-view'
export {
  AcceptInvite, Account, AccountAgents, AccountEmail, AccountLinked, AccountPasskeys, AccountPassword, AccountPhone, AccountProfile, AccountSecondStep, AccountSessions,
  ForgotPassword, GoogleOneTap, OrganizationMembers, PendingTerms, ResetPassword, SignIn, SignUp, VerifyEmail,
  type AcceptInviteEvent, type AcceptInviteProps, type AccountEvent, type AccountPartProps, type AccountProps, type AccountSection,
  type OrganizationMembersAction, type OrganizationMembersEvent, type OrganizationMembersProps, type PendingTermsProps,
  type AuthAlertProps, type AuthBadgeProps, type AuthButtonProps, type AuthCheckboxProps, type AuthComponents, type AuthConfirmOptions, type AuthDividerProps,
  type AuthFieldProps, type AuthFormLayoutProps, type AuthFormProps, type AuthInputProps, type AuthLinkProps, type AuthSelectProps, type AuthTextProps, type AuthTexts, type GoogleOneTapProps,
} from './components'
export {
  can, canAutofillPasskeys, canUsePasskeys, createAuthClient, createSessionStore, createSignInFlow, definePolicy, unwrap, CauthyError,
  type Account as AccountDetails, type AccountClient, type AccountSession, type AuthClient, type AuthError, type AuthMethods, type AuthResult,
  type ConnectedAgent, type FlowState, type FlowStep, type Invitation, type JsonValue, type LinkedIdentity, type NextStep,
  type OrganizationPerson, type OrganizationRoleChoice, type OrganizationSeat, type OrganizationsClient, type Passkey, type PasskeyKind,
  type PendingLegal, type PermissionOf, type Policy, type PublicSession, type RoleOf, type SecondStep, type SessionOrganization,
  type SessionUser, type SignInFlow, type SSOConnection,
} from '@cauthyhq/js'
export { themeFromCss, themeFromStackmyth, themeVariables, tokensFromStackmyth, type CauthyTheme } from '@cauthyhq/js/theme'
