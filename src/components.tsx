// The sign-in screens, ready to use.
//
//   <SignIn onSuccess={() => navigate('/')} />
//   <SignUp locale="es" />
//   <ForgotPassword />
//
// They are plain forms — a label, an input, a button. Import
// `@cauthyhq/react/styles.css` once and they are drawn with the colours, corners and
// typeface a person set for the workspace in Cauthy's dashboard, the same as
// Cauthy's own sign-in page. Or give them the application's own button and
// input (`components`), or a class for each part (`classNames`), and pass
// `unstyled` to leave all of that out. Everything they do is `useAuth()`: an
// application that wants another form writes it with the same functions.

import { Fragment, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentType, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { canUsePasskeys, checkEmail, checkName, checkNewPassword, checkPassword, createAuthClient, passwordProblems, describePasswordPolicy, explainPasswordProblems, MIN_PASSWORD, type PasswordPolicy, type Account as AccountDetails, type AccountSession, type AuthError, type ConnectedAgent, type AuthMethods, type Invitation, type LinkedIdentity, type OrganizationPerson, type OrganizationRoleChoice, type OrganizationSeat, type Passkey, type PendingLegal, type SecondStep, type SSOConnection } from '@cauthyhq/js'
import { useAuth, useProviderTheme, useSession, useSessionStore } from './react'
import { themeVariables, type CauthyTheme, type ThemeFont } from '@cauthyhq/js/theme'
import { checkOrganization } from '@cauthyhq/js'

/** Every sentence the forms show. Give any of them to change it. */
export interface AuthTexts {
  email: string
  password: string
  name: string
  code: string
  signIn: string
  signUp: string
  continueWith: string // "Continue with" + the provider's name
  orWithEmail: string
  /** The sign-in's box to stay signed in, shown when the application's client allows it. */
  keepSignedIn: string
  forgotPassword: string
  noAccount: string
  createAccount: string
  /** The label of the company's name, asked when the application's system makes an organization per sign-up. */
  company: string
  /** The legal box: "I have read and accept" + "the Terms of Service" + "and" + "the Privacy Policy", linked. */
  iAccept: string
  and: string
  termsOfService: string
  privacyPolicy: string
  haveAccount: string
  sendLink: string
  linkSent: string
  codeHelp: string
  /** The second step when it is a phone only. */
  codeHelpPhone: string
  /** The second step by email (the account has no factor): "{to}" is the address, masked. */
  codeHelpEmail: string
  sendEmailAgain: string
  /** "{to}" is the phone, masked. */
  sendCodeSms: string
  sendCodeWhatsapp: string
  codeSent: string
  /** The second step approved on the phone; "{n}" is the number to pick. */
  pushSend: string
  pushPick: string
  pushWaiting: string
  // The phone on the account screen.
  phone: string
  phoneHelp: string
  phoneOn: string // "{to}": the phone, masked
  phoneOff: string
  addPhone: string
  removePhone: string
  bySms: string
  byWhatsapp: string
  /** The label of the channel phone codes go by, where the application draws it as a select. */
  channel: string
  verify: string
  checkEmail: string
  backToSignIn: string
  emailMeALink: string
  /** The sign-in link's own step: what it does, its send button, the way back. */
  linkHelp: string
  sendMeTheLink: string
  back: string
  usePasskey: string
  codeFromMail: string
  signInLinkSent: string
  newPassword: string
  savePassword: string
  passwordChanged: string
  confirming: string
  emailConfirmed: string
  // <AcceptInvite />: the page an invitation opens.
  invitedTo: string // "{workspace}" is replaced
  invitedToOrganization: string // "{organization}" and "{workspace}" are replaced
  invitedAs: string // "{email}" is replaced
  choosePassword: string
  acceptInvite: string
  openingInvitation: string
  invitationInvalid: string
  // The account screen.
  profile: string
  save: string
  saved: string
  currentPassword: string
  changePassword: string
  passwordChangedHere: string
  secondStep: string
  secondStepOn: string
  secondStepOff: string
  turnOn: string
  turnOff: string
  addToApp: string // above the secret to add to an authenticator app
  openInApp: string
  qrAlt: string
  recoveryCodes: string
  newRecoveryCodes: string
  keepCodes: string
  /** Beside recovery codes just made: copy them all, or save them as a text file. */
  copyCodes: string
  downloadCodes: string
  codesCopied: string
  /** Said when the browser would not copy: the codes stay on screen to select. */
  codesNotCopied: string
  /** The action that opens the form of a part already set (the name). */
  change: string
  /** The password part, when the account has one. */
  passwordSet: string
  /** Opens the form that adds another passkey, once the account has one. */
  addAnotherPasskey: string
  passkeys: string
  managePasskeys: string
  passkeysHelp: string
  noPasskeys: string
  passkeyName: string
  /** @deprecated Unused since 0.19.0: the account screen offers `addPasskeyDevice` and `addSecurityKey`. */
  addPasskey: string
  addPasskeyDevice: string
  addSecurityKey: string
  passkeyKinds: Record<'security_key' | 'synced' | 'device', string>
  removePasskey: string
  passkeyAdded: string
  passkeyUnnamed: string
  sessions: string
  signOutEverywhere: string
  agents: string
  agentsHelp: string
  disconnect: string
  anAgent: string
  unknownDevice: string
  emailAddress: string
  newEmail: string
  changeEmail: string
  emailSent: string // after asking: "{email}" is replaced
  linkedAccounts: string
  noLinkedAccounts: string
  linkWith: string // + the provider's name
  unlink: string
  linked: string // after coming back linked
  ssoOnly: string // the address signs in through its company alone
  // <OrganizationMembers />: the people of the person's organization.
  members: string
  membersHidden: string
  organizationMissing: string
  memberYou: string
  memberInvited: string
  memberManager: string
  memberRole: string
  memberAdd: string
  memberAdded: string // "{email}" is replaced
  memberRemove: string
  memberRemoveConfirm: string // "{who}" is replaced
  memberLeave: string
  memberLeaveConfirm: string // "{org}" is replaced
  memberInviteAgain: string
  memberInvitationSent: string
  // The organization itself, for a member whose role may change it.
  organization: string
  organizationRename: string
  organizationRenamed: string // "{name}" is replaced
  organizationArchive: string
  organizationArchiveConfirm: string // "{org}" is replaced
  organizationArchived: string // "{org}" is replaced
  organizationDelete: string
  organizationDeleteConfirm: string // "{org}" is replaced
  organizationDeleted: string // "{org}" is replaced
  yes: string
  cancel: string
  // <PendingTerms />: documents a signed-in person still owes.
  termsChanged: string
  termsChangedHelp: string // followed by the documents, linked
  acceptTerms: string
  /** By error code; one missing shows what the server said. */
  errors: Record<string, string>
}

const TEXTS: Record<'en' | 'es', AuthTexts> = {
  en: {
    email: 'Email', password: 'Password', name: 'Name', company: "Your company's name", code: 'Code', signIn: 'Sign in', signUp: 'Create account',
    continueWith: 'Continue with', orWithEmail: 'or with your email', keepSignedIn: 'Keep me signed in', forgotPassword: 'Forgot your password?',
    noAccount: 'No account yet?', createAccount: 'Create one', haveAccount: 'Already have an account?',
    iAccept: 'I have read and accept', and: 'and', termsOfService: 'the Terms of Service', privacyPolicy: 'the Privacy Policy',
    sendLink: 'Send the link', linkSent: 'If that address has an account, a link to choose a new password is on its way.',
    codeHelp: 'Enter the code from your authenticator app, or a recovery code.', verify: 'Verify',
    codeHelpPhone: 'We send a code to your phone. Ask for it, then type it here, or use a recovery code.',
    codeHelpEmail: 'We sent a code to {to}. Type it here.', sendEmailAgain: 'Send the code again',
    sendCodeSms: 'Send a code by SMS to {to}', sendCodeWhatsapp: 'Send a code by WhatsApp to {to}', codeSent: 'We sent a code to {to}. Type it here.',
    pushSend: 'Approve on my phone', pushPick: 'On your phone, pick {n}', pushWaiting: 'We sent a notification to your phone. Open it and pick this number.',
    phone: 'Phone, with its country code', phoneHelp: 'Get your codes by SMS or WhatsApp instead of an app.', phoneOn: 'Codes go to {to}.',
    phoneOff: 'No phone yet.', addPhone: 'Add phone', removePhone: 'Remove phone', bySms: 'SMS', byWhatsapp: 'WhatsApp', channel: 'Send codes by',
    checkEmail: 'Almost there: open the link we sent to confirm your address — it signs you in.', backToSignIn: 'Back to sign in',
    emailMeALink: 'Email me a sign-in link', linkHelp: 'We will email you a link that signs you in, no password needed.', sendMeTheLink: 'Send me the link', back: 'Back', usePasskey: 'Sign in with a passkey', codeFromMail: 'Reading it on another device? Enter the code from the email.', signInLinkSent: 'If that address has an account, a link to sign in is on its way.',
    newPassword: 'New password', savePassword: 'Save the password', passwordChanged: 'Your password was changed. You can sign in with it now.',
    confirming: 'Confirming your address…', emailConfirmed: 'Your address is confirmed. You can sign in now.',
    invitedTo: "You've been invited to {workspace}", invitedToOrganization: "You've been invited to {organization} on {workspace}",
    invitedAs: 'You will sign in as {email}.', choosePassword: 'Choose a password', acceptInvite: 'Accept and sign in',
    openingInvitation: 'Opening your invitation…', invitationInvalid: 'This invitation is not valid: it was already used, or it has expired. Ask whoever invited you to send it again.',
    profile: 'Profile', save: 'Save', saved: 'Saved.', currentPassword: 'Current password', changePassword: 'Change password',
    passwordChangedHere: 'Your password was changed. Every other session of your account was signed out.',
    secondStep: 'Second step', secondStepOn: 'On: signing in also asks for a code from your authenticator app.', secondStepOff: 'Off: signing in asks only for your password.',
    turnOn: 'Turn on', turnOff: 'Turn off', addToApp: 'Scan this code with your authenticator app, or add the key below by hand, then enter the code it shows.', openInApp: 'Open in an authenticator app', qrAlt: 'QR code to add this account to an authenticator app',
    recoveryCodes: 'Recovery codes', newRecoveryCodes: 'New recovery codes', keepCodes: 'Keep these codes somewhere safe. Each works once, and they are not shown again.',
    copyCodes: 'Copy all', downloadCodes: 'Download .txt', codesCopied: 'The codes were copied.', codesNotCopied: 'The codes could not be copied. Select them and copy them by hand.',
    change: 'Change', passwordSet: 'Your account has a password.', addAnotherPasskey: 'Add a passkey',
    passkeys: 'Passkeys', managePasskeys: 'Add or remove a passkey',
    passkeysHelp: 'Sign in with your fingerprint, your face or your device\'s lock, without a password.', noPasskeys: 'No passkey yet.',
    passkeyName: 'A name for this device (optional)', addPasskey: 'Add a passkey on this device', removePasskey: 'Remove',
    addPasskeyDevice: 'Add this device (fingerprint or face)', addSecurityKey: 'Add a security key',
    passkeyKinds: { security_key: 'Security key', synced: 'Synced across your devices', device: 'On this device only' },
    passkeyAdded: 'The passkey was added. Next time, sign in with it.', passkeyUnnamed: 'Passkey', sessions: 'Where you are signed in', signOutEverywhere: 'Sign out everywhere',
    agents: 'AI agents', agentsHelp: 'Agents you allowed to act for you. Disconnect one and it loses its access within minutes.', disconnect: 'Disconnect', anAgent: 'An AI agent', unknownDevice: 'Unknown device',
    emailAddress: 'Email address', newEmail: 'New email address', changeEmail: 'Change email',
    emailSent: 'We sent a link to {email}. Your address changes once you open it.',
    linkedAccounts: 'Linked accounts', noLinkedAccounts: 'No account is linked.', linkWith: 'Link', unlink: 'Unlink', linked: 'The account was linked.',
    ssoOnly: 'Your company signs you in to this account.',
    members: 'Members', membersHidden: 'Your role here does not let you see the members.', organizationMissing: 'You do not belong to this organization.',
    memberYou: 'you', memberInvited: 'invited', memberManager: 'manages members', memberRole: 'Role', memberAdd: 'Add member',
    memberAdded: '{email} is a member now.', memberRemove: 'Remove', memberRemoveConfirm: 'Remove {who}?', memberLeave: 'Leave',
    memberLeaveConfirm: 'Leave {org}? You will need an invitation to come back.', memberInviteAgain: 'Send the invitation again',
    memberInvitationSent: 'The invitation is on its way.',
    organization: 'Organization', organizationRename: 'Rename', organizationRenamed: 'The organization is now called {name}.',
    organizationArchive: 'Archive', organizationArchiveConfirm: 'Archive {org}? Its members will no longer reach it, and only the workspace can restore it.',
    organizationArchived: '{org} was archived.', organizationDelete: 'Delete organization',
    organizationDeleteConfirm: 'Delete {org} for good? Its members lose it and this cannot be undone.', organizationDeleted: '{org} was deleted.',
    yes: 'Yes', cancel: 'Cancel',
    termsChanged: 'Our terms changed', termsChangedHelp: 'To go on, read and accept', acceptTerms: 'Accept',
    errors: {
      not_allowed: 'Your role in this organization does not allow that.', last_manager: 'Somebody else must manage the members first: give that role to another member.',
      last_owner: 'An organization keeps at least one owner: make another member owner first.', organization_not_found: 'That organization no longer exists.',
      member_exists: 'That person already belongs to the organization; their role was not changed. Change it in the list instead.',
      already_member: 'That person already belongs to the organization. Change their role instead.', unknown_role: 'Choose one of the roles offered.',
      user_not_active: 'That account is disabled.',
      required: 'This is required.', invalid_email: 'That does not look like an email address.', too_short: `Use at least ${MIN_PASSWORD} characters.`,
      invalid_credentials: 'The address or the password is not right.', unavailable: 'Sign-in is unavailable right now. Try again in a moment.',
      state_mismatch: 'That sign-in could not be completed. Try again.', cancelled: 'The sign-in was cancelled.',
      email_taken: 'That address already has an account.', email_unchanged: 'That is already your address.',
      last_sign_in_method: 'Add a password or link another account first: it is your only way to sign in.',
      identity_already_linked: 'That account is linked to someone else.', manual_linking_disabled: 'Linking accounts is turned off for this workspace.',
      invalid_token: 'This link is not valid, or it has expired. Ask for a new one.', invalid_code: 'That code is not right, or it has expired.', wrong_password: 'The current password is not right.', step_up_required: 'Enter your current password.', weak_password: 'Choose a stronger password.', unauthenticated: 'Sign in first.',
      phone_refused: 'The code could not be sent to that number.', too_many_codes: 'Enough codes were sent. Use the last one, or sign in again.', phone_unavailable: 'Codes cannot be sent that way here.', phone_already_set: 'Remove the phone you have first.', phone_codes_unavailable: 'Codes cannot be sent right now. Try again in a moment.',
      captcha_required: 'Complete the check that you are not a bot, then try again.', captcha_failed: 'The check that you are not a bot did not pass. Try it again.',
      passkey_failed: 'The passkey could not be used. Try again, or sign in another way.', passkey_exists: 'This device already has a passkey for your account.', passkey_unavailable: 'Passkeys cannot be used here.',
      sso_required: 'This address signs in through its company.', sso_not_found: 'No company sign-in answers for this address.',
      sso_failed: 'The sign-in with your company could not be completed. Try again.', sso_unavailable: 'Your company\'s sign-in cannot be reached right now. Try again in a moment.',
      invalid_assertion: 'Your company\'s answer could not be checked. Try again.', provisioning_disabled: 'Your company\'s sign-in worked, but this workspace has no account for you. Ask its admin to add you.',
      connection_inactive: 'Your company\'s sign-in is turned off for this workspace.', invalid_grant: 'That sign-in expired. Try again.',
      password_disabled: 'This workspace does not sign in with a password. Use one of the other ways.', passkeys_disabled: 'Passkeys are turned off for this workspace.',
    },
  },
  es: {
    email: 'Correo', password: 'Contraseña', name: 'Nombre', company: 'Nombre de tu empresa', code: 'Código', signIn: 'Entrar', signUp: 'Crear cuenta',
    continueWith: 'Continuar con', orWithEmail: 'o con tu correo', keepSignedIn: 'Mantener la sesión abierta', forgotPassword: '¿Olvidaste tu contraseña?',
    noAccount: '¿No tienes cuenta?', createAccount: 'Crear una', haveAccount: '¿Ya tienes cuenta?',
    iAccept: 'He leído y acepto', and: 'y', termsOfService: 'los Términos del servicio', privacyPolicy: 'la Política de privacidad',
    sendLink: 'Enviar el enlace', linkSent: 'Si ese correo tiene una cuenta, ya va en camino un enlace para elegir una contraseña nueva.',
    codeHelp: 'Escribe el código de tu aplicación de autenticación, o un código de recuperación.', verify: 'Verificar',
    codeHelpPhone: 'Te enviamos un código a tu teléfono. Pídelo y escríbelo aquí, o usa un código de recuperación.',
    codeHelpEmail: 'Te enviamos un código a {to}. Escríbelo aquí.', sendEmailAgain: 'Enviar el código de nuevo',
    sendCodeSms: 'Enviar un código por SMS a {to}', sendCodeWhatsapp: 'Enviar un código por WhatsApp a {to}', codeSent: 'Te enviamos un código a {to}. Escríbelo aquí.',
    pushSend: 'Aprobar en mi teléfono', pushPick: 'En tu teléfono, elige el {n}', pushWaiting: 'Enviamos una notificación a tu teléfono. Ábrela y elige este número.',
    phone: 'Teléfono, con su código de país', phoneHelp: 'Recibe tus códigos por SMS o WhatsApp en vez de una app.', phoneOn: 'Los códigos van a {to}.',
    phoneOff: 'Todavía no tienes un teléfono.', addPhone: 'Agregar teléfono', removePhone: 'Quitar teléfono', bySms: 'SMS', byWhatsapp: 'WhatsApp', channel: 'Enviar los códigos por',
    checkEmail: 'Casi listo: abre el enlace que te enviamos para confirmar tu correo; te deja adentro.', backToSignIn: 'Volver a entrar',
    emailMeALink: 'Envíame un enlace para entrar', linkHelp: 'Te enviamos un enlace al correo que te deja entrar, sin contraseña.', sendMeTheLink: 'Envíame el enlace', back: 'Volver', usePasskey: 'Entrar con una llave de acceso', codeFromMail: '¿Lo estás leyendo en otro dispositivo? Escribe el código que trae el correo.', signInLinkSent: 'Si ese correo tiene una cuenta, ya va en camino un enlace para entrar.',
    newPassword: 'Contraseña nueva', savePassword: 'Guardar la contraseña', passwordChanged: 'Tu contraseña se cambió. Ya puedes entrar con ella.',
    confirming: 'Confirmando tu correo…', emailConfirmed: 'Tu correo quedó confirmado. Ya puedes entrar.',
    invitedTo: 'Te invitaron a {workspace}', invitedToOrganization: 'Te invitaron a {organization} en {workspace}',
    invitedAs: 'Vas a entrar como {email}.', choosePassword: 'Elige una contraseña', acceptInvite: 'Aceptar y entrar',
    openingInvitation: 'Abriendo tu invitación…', invitationInvalid: 'Esta invitación no es válida: ya se usó o venció. Pídele a quien te invitó que te la envíe de nuevo.',
    profile: 'Perfil', save: 'Guardar', saved: 'Guardado.', currentPassword: 'Contraseña actual', changePassword: 'Cambiar contraseña',
    passwordChangedHere: 'Tu contraseña se cambió. Se cerraron todas las demás sesiones de tu cuenta.',
    secondStep: 'Segundo paso', secondStepOn: 'Activo: al entrar también se pide un código de tu aplicación de autenticación.', secondStepOff: 'Inactivo: al entrar solo se pide tu contraseña.',
    turnOn: 'Activar', turnOff: 'Desactivar', addToApp: 'Escanea este código con tu aplicación de autenticación, o agrega a mano la clave de abajo, y escribe el código que muestra.', openInApp: 'Abrir en una aplicación de autenticación', qrAlt: 'Código QR para agregar esta cuenta a una aplicación de autenticación',
    recoveryCodes: 'Códigos de recuperación', newRecoveryCodes: 'Nuevos códigos de recuperación', keepCodes: 'Guarda estos códigos en un lugar seguro. Cada uno sirve una vez y no se vuelven a mostrar.',
    copyCodes: 'Copiar todos', downloadCodes: 'Descargar .txt', codesCopied: 'Los códigos quedaron copiados.', codesNotCopied: 'No se pudieron copiar los códigos. Selecciónalos y cópialos a mano.',
    change: 'Cambiar', passwordSet: 'Tu cuenta tiene contraseña.', addAnotherPasskey: 'Agregar una llave de acceso',
    passkeys: 'Llaves de acceso', managePasskeys: 'Agregar o quitar una llave de acceso',
    passkeysHelp: 'Entra con tu huella, tu rostro o el bloqueo de tu dispositivo, sin contraseña.', noPasskeys: 'Todavía no tienes llaves de acceso.',
    passkeyName: 'Un nombre para este dispositivo (opcional)', addPasskey: 'Agregar una llave en este dispositivo', removePasskey: 'Quitar',
    addPasskeyDevice: 'Agregar este dispositivo (huella o rostro)', addSecurityKey: 'Agregar una llave física',
    passkeyKinds: { security_key: 'Llave física', synced: 'Sincronizada entre tus dispositivos', device: 'Solo en un dispositivo' },
    passkeyAdded: 'La llave de acceso quedó agregada. La próxima vez, entra con ella.', passkeyUnnamed: 'Llave de acceso', sessions: 'Dónde tienes la sesión abierta', signOutEverywhere: 'Cerrar sesión en todas partes',
    agents: 'Agentes de IA', agentsHelp: 'Los agentes a los que permitiste actuar por ti. Si desconectas uno, pierde el acceso en pocos minutos.', disconnect: 'Desconectar', anAgent: 'Un agente de IA', unknownDevice: 'Dispositivo desconocido',
    emailAddress: 'Correo', newEmail: 'Correo nuevo', changeEmail: 'Cambiar el correo',
    emailSent: 'Enviamos un enlace a {email}. Tu correo cambia cuando lo abras.',
    linkedAccounts: 'Cuentas vinculadas', noLinkedAccounts: 'No hay cuentas vinculadas.', linkWith: 'Vincular', unlink: 'Desvincular', linked: 'La cuenta quedó vinculada.',
    ssoOnly: 'A esta cuenta entras con el inicio de sesión de tu empresa.',
    members: 'Miembros', membersHidden: 'Tu rol aquí no te deja ver los miembros.', organizationMissing: 'No perteneces a esta organización.',
    memberYou: 'tú', memberInvited: 'invitado', memberManager: 'administra los miembros', memberRole: 'Rol', memberAdd: 'Agregar miembro',
    memberAdded: '{email} ya es miembro.', memberRemove: 'Quitar', memberRemoveConfirm: '¿Quitar a {who}?', memberLeave: 'Salir',
    memberLeaveConfirm: '¿Salir de {org}? Necesitarás una invitación para volver.', memberInviteAgain: 'Enviar la invitación de nuevo',
    memberInvitationSent: 'La invitación va en camino.',
    organization: 'Organización', organizationRename: 'Cambiar nombre', organizationRenamed: 'La organización ahora se llama {name}.',
    organizationArchive: 'Archivar', organizationArchiveConfirm: '¿Archivar {org}? Sus miembros ya no podrán entrar y solo el espacio de trabajo puede restaurarla.',
    organizationArchived: '{org} quedó archivada.', organizationDelete: 'Eliminar organización',
    organizationDeleteConfirm: '¿Eliminar {org} para siempre? Sus miembros la pierden y no se puede deshacer.', organizationDeleted: '{org} quedó eliminada.',
    yes: 'Sí', cancel: 'Cancelar',
    termsChanged: 'Nuestros términos cambiaron', termsChangedHelp: 'Para seguir, lee y acepta', acceptTerms: 'Aceptar',
    errors: {
      not_allowed: 'Tu rol en esta organización no permite eso.', last_manager: 'Primero alguien más debe administrar los miembros: dale ese rol a otro miembro.',
      last_owner: 'Una organización conserva al menos un propietario: primero haz propietario a otro miembro.', organization_not_found: 'Esa organización ya no existe.',
      member_exists: 'Esa persona ya pertenece a la organización; su rol no cambió. Cámbialo en la lista.',
      already_member: 'Esa persona ya pertenece a la organización. Cambia su rol.', unknown_role: 'Escoge uno de los roles ofrecidos.',
      user_not_active: 'Esa cuenta está desactivada.',
      required: 'Este dato es obligatorio.', invalid_email: 'Eso no parece un correo.', too_short: `Usa al menos ${MIN_PASSWORD} caracteres.`,
      invalid_credentials: 'El correo o la contraseña no son correctos.', unavailable: 'No se puede entrar en este momento. Intenta de nuevo en un momento.',
      state_mismatch: 'No se pudo completar el ingreso. Intenta de nuevo.', cancelled: 'El ingreso se canceló.',
      email_taken: 'Ese correo ya tiene una cuenta.', email_unchanged: 'Ese ya es tu correo.',
      last_sign_in_method: 'Primero agrega una contraseña o vincula otra cuenta: es tu única forma de entrar.',
      identity_already_linked: 'Esa cuenta está vinculada a otra persona.', manual_linking_disabled: 'Vincular cuentas está desactivado en este workspace.',
      invalid_token: 'Este enlace no es válido o ya venció. Pide uno nuevo.', invalid_code: 'Ese código no es correcto o ya venció.', wrong_password: 'La contraseña actual no es correcta.', step_up_required: 'Escribe tu contraseña actual.', weak_password: 'Elige una contraseña más fuerte.', unauthenticated: 'Inicia sesión primero.',
      phone_refused: 'No se pudo enviar el código a ese número.', too_many_codes: 'Ya se enviaron suficientes códigos. Usa el último o vuelve a entrar.', phone_unavailable: 'Aquí no se pueden enviar códigos de esa forma.', phone_already_set: 'Primero quita el teléfono que tienes.', phone_codes_unavailable: 'Ahora no se pueden enviar códigos. Inténtalo en un momento.',
      captcha_required: 'Completa la verificación de que no eres un robot y vuelve a intentarlo.', captcha_failed: 'La verificación de que no eres un robot no pasó. Inténtalo de nuevo.',
      passkey_failed: 'No se pudo usar la llave de acceso. Intenta de nuevo o entra de otra forma.', passkey_exists: 'Este dispositivo ya tiene una llave de acceso de tu cuenta.', passkey_unavailable: 'Aquí no se pueden usar llaves de acceso.',
      sso_required: 'Este correo entra con el inicio de sesión de su empresa.', sso_not_found: 'Ninguna empresa usa inicio de sesión propio con este correo.',
      sso_failed: 'No se pudo completar el ingreso con tu empresa. Intenta de nuevo.', sso_unavailable: 'Ahora no se puede llegar al inicio de sesión de tu empresa. Intenta en un momento.',
      invalid_assertion: 'No se pudo verificar la respuesta de tu empresa. Intenta de nuevo.', provisioning_disabled: 'El ingreso con tu empresa funcionó, pero este workspace no tiene una cuenta para ti. Pídele a su admin que te agregue.',
      connection_inactive: 'El inicio de sesión de tu empresa está apagado en este workspace.', invalid_grant: 'Ese ingreso venció. Intenta de nuevo.',
      password_disabled: 'En este workspace no se entra con contraseña. Usa una de las otras formas.', passkeys_disabled: 'Las llaves de acceso están desactivadas en este workspace.',
    },
  },
}

type Slot = 'form' | 'field' | 'label' | 'input' | 'button' | 'providerButton' | 'providerIcon' | 'link' | 'error' | 'fieldError' | 'hint' | 'notice' | 'pending' | 'separator' | 'footer' | 'check' | 'account' | 'section' | 'heading' | 'secret' | 'qr' | 'codes' | 'sessions' | 'session'

export interface AuthFormProps {
  /** The language of the built-in sentences. Default: `en`. */
  locale?: 'en' | 'es'
  /** Sentences of the application's own, over the built-in ones. */
  texts?: Partial<Omit<AuthTexts, 'errors'>> & { errors?: Record<string, string> }
  /**
   * Called once the person is signed in, instead of going to `returnTo`. The
   * form stays busy (its button loading, every control disabled) until it
   * leaves the page. When the application keeps the form on screen while it
   * moves on (a router's navigation, loading the session), return a Promise:
   * the form waits for it, then is free again if it is still shown.
   */
  onSuccess?: () => void | Promise<unknown>
  /** Where to go after signing in, and where a provider returns to. Default: `/`. */
  returnTo?: string
  /**
   * `<SignIn />`: a sign-in link sent to an address with no account makes
   * one when it is used (if the workspace accepts new accounts), so this one
   * screen signs people in and up alike. Default: off.
   */
  createAccounts?: boolean
  /** Paths of the application's other screens, for the links between them. */
  links?: { signIn?: string; signUp?: string; forgotPassword?: string }
  /** A class for each part the form renders. A part given one is left to it by `styles.css`. */
  classNames?: Partial<Record<Slot, string>>
  /**
   * No look of Cauthy's at all: `styles.css` leaves the form alone and the
   * workspace's colours are not read. For a form drawn wholly with the
   * application's own `components` or `classNames`.
   */
  unstyled?: boolean
  /**
   * Take the colours, corners and typeface a person set for the workspace in
   * Cauthy's dashboard. Default: true. False keeps `styles.css`'s own, and
   * whatever `--cauthy-*` variables the application sets.
   */
  workspaceLook?: boolean
  /**
   * The application's own parts, to draw the form with: its form layout,
   * button, input, checkbox, select, field, text, badge, link, divider, alert
   * and confirmation. A part not given is drawn as before; with every part given
   * and `unstyled`, the form adds no element that carries a look of its own.
   */
  components?: AuthComponents
}

/**
 * What the application's button is given: what a `<button>` would be, and
 * what kind of button it is. `primary` sends the form; `secondary` is any
 * other action (a provider, a passkey, a sign-in link, cancel, send again);
 * `danger` removes, leaves, deletes, disconnects or turns something off.
 * `loading` is true on the one button whose action is under way; every
 * button is `disabled` meanwhile. Draw a spinner (or the like) on the button
 * while `loading` is true, and keep its label: after a sign-in it stays true
 * until the page is left, so the person sees the work go on.
 */
export interface AuthButtonProps {
  type: 'submit' | 'button'; disabled?: boolean; className?: string; onClick?: () => void; children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

/**
 * What the application's form layout is given: every element the forms put
 * around their parts — a whole form, each step of it, each part of the
 * account and members screens — so its own stack lays them out. `as` says
 * which element it stands for: a `form` sends with `onSubmit` (render a
 * `<form>` with it for Enter to submit), a `div` only groups.
 */
export interface AuthFormLayoutProps {
  as: 'form' | 'div'
  onSubmit?: (e: FormEvent) => void
  noValidate?: boolean
  'aria-busy'?: boolean
  className?: string
  /**
   * Which part of `<Account />` or `<OrganizationMembers />` this is, for an
   * application that draws each as a card: an `AccountSection`
   * (`profile`, `passkeys`…), or `members`, `add-member`, `organization`
   * and `rename` (the form inside `organization`). Not set on a whole form.
   */
  section?: string
  children: ReactNode
}

/** What the application's input is given: what an `<input>` would be. */
export interface AuthInputProps {
  id: string; name: string; type: string; value: string; autoComplete?: string; required?: boolean; disabled?: boolean; className?: string
  'aria-invalid'?: boolean; 'aria-describedby'?: string; onChange: (e: { target: { value: string } }) => void
}

/** A box to tick: the legal documents and each consent of a sign-up. `children` is its label. */
export interface AuthCheckboxProps {
  id: string; name: string; checked: boolean; required?: boolean; disabled?: boolean; className?: string
  onChange: (checked: boolean) => void; children: ReactNode
}

/** One choice of a few: a member's role, the channel of phone codes. Without a visible label it carries `aria-label`. */
export interface AuthSelectProps {
  id: string; name: string; value: string; options: { value: string; label: string }[]; disabled?: boolean; className?: string
  'aria-label'?: string; onChange: (value: string) => void
}

/**
 * A label, its control (`children`) and what is said under it. The control's
 * `aria-describedby` names `${id}-hint` and `${id}-error`: give the help and
 * the error those ids for a screen reader to read them with it.
 */
export interface AuthFieldProps {
  id: string; label: ReactNode; children: ReactNode
  /** Beside the label: "Forgot your password?". */
  aside?: ReactNode
  /** What the field takes (a new password's rule). Not given while there is an error. */
  help?: ReactNode
  error?: ReactNode
  required?: boolean; className?: string
}

/** A sentence of the form: help, a state, the footer (`size: 'sm'`), a section's heading (`as: 'h2'`). */
export interface AuthTextProps { as?: 'p' | 'span' | 'h2'; tone?: 'muted' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg'; children: ReactNode }

/** A short mark beside a name: "you", "invited", a role, a passkey's kind. */
export interface AuthBadgeProps { tone?: 'neutral' | 'success' | 'warning' | 'danger'; children: ReactNode }

/** A link: to another screen, or a legal document (`newTab`). */
export interface AuthLinkProps { href?: string; onClick?: () => void; newTab?: boolean; children: ReactNode }

/** The line between the providers and the address: "or with your email". */
export interface AuthDividerProps { label?: ReactNode }

/**
 * What went wrong (`danger`), what was done (`success`) or what to know
 * (`info`). The built-in one is announced: `role="alert"` for danger,
 * `role="status"` otherwise; the application's should be too.
 */
export interface AuthAlertProps { tone: 'danger' | 'info' | 'success'; children: ReactNode }

/** What a confirmation asks: removing a member, leaving, archiving or deleting the organization. */
export interface AuthConfirmOptions { title: string; body?: string; confirmLabel: string; cancelLabel: string; danger?: boolean }

/** The parts a form may be drawn with. See `AuthFormProps.components`. */
export interface AuthComponents {
  /**
   * Every element around the form's parts: the form itself, each step, each
   * part of the account and members screens. Not given: the `form`, `div` or
   * `section` the forms have always drawn.
   */
  Form?: ComponentType<AuthFormLayoutProps>
  Button?: ComponentType<AuthButtonProps>
  Input?: ComponentType<AuthInputProps>
  Checkbox?: ComponentType<AuthCheckboxProps>
  Select?: ComponentType<AuthSelectProps>
  Field?: ComponentType<AuthFieldProps>
  Text?: ComponentType<AuthTextProps>
  Badge?: ComponentType<AuthBadgeProps>
  Link?: ComponentType<AuthLinkProps>
  Divider?: ComponentType<AuthDividerProps>
  Alert?: ComponentType<AuthAlertProps>
  /**
   * Asks before something that cannot be undone, and answers whether to go
   * on: the application's own dialog. Not given: the question shows inline,
   * with a yes and a cancel button. Never the browser's own dialog.
   */
  Confirm?: (options: AuthConfirmOptions) => Promise<boolean>
}

// Declared once: a component made anew on every render would be a different
// input each time, and the one being typed in would lose its place.
// The kind of a button is for the application's own button. The plain one
// says it is under way with a spinner before its label, drawn by styles.css.
const PlainButton: ComponentType<AuthButtonProps> = ({ variant: _variant, loading, children, ...p }) => (
  <button {...p} aria-busy={loading || undefined}>{loading && <Spinner />}{children}</button>
)
// With `unstyled` no stylesheet draws a spinner: the icon draws and turns itself.
const UnstyledButton: ComponentType<AuthButtonProps> = ({ variant: _variant, loading, children, ...p }) => (
  <button {...p} aria-busy={loading || undefined}>{loading && <><Spinner plain />{' '}</>}{children}</button>
)

/**
 * Work under way, as an icon and never as words: the application may be in
 * any language. Styled, it is the ring styles.css draws (still under
 * `prefers-reduced-motion`). Unstyled, no stylesheet is there, so it is an SVG
 * that turns by itself (SMIL), and stands still when the person asked for less
 * motion. The button or form around it says `aria-busy`; the icon is hidden
 * from screen readers.
 */
function Spinner({ plain }: { plain?: boolean }) {
  if (!plain) return <span className="cauthy-spinner" aria-hidden="true" />
  return <SpinnerIcon />
}

const LESS_MOTION = '(prefers-reduced-motion: reduce)'

function watchMotion(changed: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(LESS_MOTION)
  query.addEventListener?.('change', changed)
  return () => query.removeEventListener?.('change', changed)
}
// A browser that cannot say has no preference to honour.
const stillHere = () => typeof window.matchMedia === 'function' && window.matchMedia(LESS_MOTION).matches
// The server cannot know: its page draws the icon still, and the browser
// sets it turning once it is there.
const stillOnServer = () => true

function SpinnerIcon() {
  const still = useSyncExternalStore(watchMotion, stillHere, stillOnServer)
  return (
    <svg className="cauthy-spinner-icon" width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {!still && <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.7s" repeatCount="indefinite" />}
      </path>
    </svg>
  )
}
const PlainInput: ComponentType<AuthInputProps> = (p) => <input {...p} />

// The workspace's look, read once per page and per mount point of the routes.
const looks = new Map<string, Promise<CauthyTheme | null>>()

// A typeface is loaded from where the workspace's look says, once per page.
const loaded = new Set<string>()
function loadFonts(fonts: ThemeFont[] | undefined) {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return
  for (const f of fonts ?? []) {
    const key = `${f.family}|${f.url}|${f.weight ?? ''}|${f.style ?? ''}`
    // The same checks Cauthy's pages make: a plain family name, an https .woff2.
    if (loaded.has(key) || !/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(f.family) || !/^https:\/\/[^\s"'()]+\.woff2$/i.test(f.url)) continue
    loaded.add(key)
    const face = new FontFace(f.family, `url("${f.url}") format("woff2")`, { weight: String(f.weight ?? '400'), style: f.style === 'italic' ? 'italic' : 'normal', display: 'swap' })
    void face.load().then((ready) => document.fonts.add(ready), () => loaded.delete(key))
  }
}

/**
 * What the outermost element of a form carries: the mark `styles.css` styles
 * (`data-cauthy`) and the look as its variables: the workspace's from Cauthy's
 * dashboard, with the application's own (<CauthyProvider theme>) laid over it.
 */
function useRoot(props: { unstyled?: boolean; workspaceLook?: boolean }): { 'data-cauthy'?: ''; style?: CSSProperties } {
  const { basePath } = useSession()
  // The provider's own client: its fetch and its protocol check apply to the look too.
  const store = useSessionStore()
  // The application's own look, given to <CauthyProvider theme>: what it sets wins, the rest is the workspace's.
  const given = useProviderTheme()
  const [workspace, setWorkspace] = useState<CauthyTheme | null>(null)
  const wanted = !props.unstyled && props.workspaceLook !== false
  useEffect(() => {
    if (!props.unstyled && given) loadFonts(given.fonts)
  }, [given, props.unstyled])
  useEffect(() => {
    if (!wanted) return
    let live = true
    let look = looks.get(basePath)
    if (!look) {
      look = store.auth.look()
      looks.set(basePath, look)
    }
    void look.then((theme) => {
      if (!live || !theme) return
      setWorkspace(theme)
      loadFonts(theme.fonts)
    })
    return () => { live = false }
  }, [basePath, store, wanted])
  if (props.unstyled) return {}
  const shown = wanted ? workspace : null
  return { 'data-cauthy': '', style: themeVariables({ ...shown, ...given }) as CSSProperties }
}

/** Cloudflare Turnstile, as much of it as the forms use. */
interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}

let turnstileScript: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  const ready = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile
  if (ready()) return Promise.resolve(ready()!)
  turnstileScript ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => (ready() ? resolve(ready()!) : reject(new Error('turnstile did not load')))
    script.onerror = () => {
      turnstileScript = null
      reject(new Error('turnstile did not load'))
    }
    document.head.appendChild(script)
  })
  return turnstileScript
}

/**
 * The workspace's Turnstile challenge, when it asks for one: the widget to put
 * in the form, the answer to send with it, and `renew` for after a submit
 * (an answer is good once). Without a site key it draws nothing.
 */
function useChallenge(siteKey: string | undefined, locale: string | undefined) {
  const box = useRef<HTMLDivElement | null>(null)
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null)
  const [token, setToken] = useState('')
  useEffect(() => {
    if (!siteKey || !box.current) return
    let gone = false
    void loadTurnstile().then((api) => {
      if (gone || !box.current) return
      const id = api.render(box.current, {
        sitekey: siteKey, language: locale ?? 'auto', size: 'flexible',
        callback: (t: string) => setToken(t), 'expired-callback': () => setToken(''), 'error-callback': () => setToken(''),
      })
      widget.current = { api, id }
    }).catch(() => {})
    return () => {
      gone = true
      if (widget.current) widget.current.api.remove(widget.current.id)
      widget.current = null
    }
  }, [siteKey, locale])
  const renew = () => {
    setToken('')
    if (widget.current) widget.current.api.reset(widget.current.id)
  }
  const node = siteKey ? <div ref={box} className="cauthy-challenge" /> : null
  return { node, token: token || undefined, renew }
}

/** What the workspace offers, for a form that does not read it otherwise. */
function useMethods(auth: ReturnType<typeof useAuth>) {
  const [methods, setMethods] = useState<AuthMethods | null>(null)
  useEffect(() => {
    void auth.methods().then(setMethods)
    // Once: what the workspace offers does not change while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return methods
}

/** A path of this site, or nothing: never sends the browser elsewhere. */
function sitePath(to: string | null | undefined): string | undefined {
  return to && to.startsWith('/') && !to.startsWith('//') && !to.includes('\\') ? to : undefined
}

/**
 * Where to go once signed in: a path of this site, or an address on this
 * site's own origin. `returnTo` is the application's, but a page may fill it
 * from its query string, so another origin is never followed.
 */
function sameOrigin(to: string | null | undefined): string | undefined {
  const path = sitePath(to)
  if (path || !to) return path
  try {
    const url = new URL(to)
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : undefined
  } catch {
    return undefined
  }
}

/** Whether what a callback answered is a Promise to wait for. */
function isPending(v: unknown): v is PromiseLike<unknown> {
  return typeof (v as PromiseLike<unknown> | null)?.then === 'function'
}

/**
 * Exported for the tests: the package does not export it. `waiting`: the
 * form is not ready yet (what the workspace offers is on its way), so every
 * control waits. `part`: a part of a screen whose look is the screen's.
 */
export function useForm(props: AuthFormProps, opts: { waiting?: boolean; part?: boolean } = {}) {
  const t: AuthTexts = { ...TEXTS[props.locale ?? 'en'], ...props.texts, errors: { ...TEXTS[props.locale ?? 'en'].errors, ...props.texts?.errors } }
  const cx = (slot: Slot) => props.classNames?.[slot] ?? `cauthy-${slot}`
  // The class the application gave a part, alone: an application's own part
  // is not handed Cauthy's class names.
  const own = (slot: Slot) => props.classNames?.[slot]
  const C: AuthComponents = props.components ?? {}
  const Button = C.Button ?? (props.unstyled ? UnstyledButton : PlainButton)
  const Input = C.Input ?? PlainInput
  const [error, setOnlyError] = useState<AuthError | null>(null)
  // Every field the form found wrong before sending, in the order they are
  // drawn; `round` moves the focus to the first one again on each try.
  const [problems, setProblems] = useState<{ list: AuthError[]; round: number }>({ list: [], round: 0 })
  // What the server said replaces what the form found.
  const setError = useCallback((e: AuthError | null) => {
    setOnlyError(e)
    setProblems((p) => (p.list.length === 0 ? p : { list: [], round: p.round }))
  }, [])
  /**
   * Checks every field at once, in the order they are drawn: each one wrong
   * shows its error, and the first is focused. True when all can be sent.
   */
  const check = (...found: (AuthError | null | undefined | false)[]): boolean => {
    const list = found.filter((e): e is AuthError => Boolean(e))
    setOnlyError(null)
    setProblems((p) => ({ list, round: list.length > 0 ? p.round + 1 : p.round }))
    return list.length === 0
  }
  /** The error of one field: what the form found, or what the server said. */
  const fieldError = (name: string): AuthError | null => problems.list.find((e) => e.field === name) ?? (error?.field === name ? error : null)
  /** Whether this field is the one to focus after a try, and the try's number. */
  const firstWrong = (name: string): number => (problems.list[0]?.field === name ? problems.round : 0)
  // The action under way, by the key of its button: `true` is the form's own
  // submit. Every button waits while one runs; only its own says it loads.
  const [acting, setActing] = useState<string | null>(null)
  const busy = acting !== null || opts.waiting === true
  const setBusy = useCallback((on: boolean | string) => setActing(on === false ? null : on === true ? SUBMIT : on), [])
  const loading = (key: string = SUBMIT) => acting === key
  // Whether the form is still shown: a wait that ends after it left has nothing to free.
  const shown = useRef(true)
  useEffect(() => {
    shown.current = true
    // Back to a page the browser kept (back-forward cache): the form it left
    // waiting is free again.
    const back = (e: PageTransitionEvent) => { if (e.persisted) setActing(null) }
    window.addEventListener('pageshow', back)
    return () => {
      shown.current = false
      window.removeEventListener('pageshow', back)
    }
  }, [])
  /**
   * After an action that leaves the form: it stays busy until the page is
   * left. When `after` is a Promise (the application's own way on), until it
   * settles, and then it is free again if it is still shown.
   */
  const hold = (after: unknown) => {
    if (!isPending(after)) return
    const free = () => { if (shown.current) setActing(null) }
    after.then(free, free)
  }
  /** What went wrong: the form is free again, and says it. */
  const fail = (e: AuthError) => {
    setActing(null)
    setError(e)
  }
  // The workspace's password rule, once methods() said it: what a refused
  // new password is told, rule by rule.
  const [policy, setPolicy] = useState<PasswordPolicy | undefined>(undefined)
  const locale = props.locale ?? 'en'
  const say = (e: AuthError) => {
    if (props.texts?.errors?.[e.code] === undefined && isPasswordRule(e)) return explainPasswordProblems(e.reasons ?? [e.code], policy, locale)
    return t.errors[e.code] ?? e.message
  }
  /** What a new password must be, for under its field. */
  const passwordRule = describePasswordPolicy(policy, locale)
  // `to`: where a sign-in link or code says to go, over `returnTo`. Signed
  // in: the form stays busy, its pressed button loading (the submit when none
  // was, as after a passkey from the autofill), until the page is left or the
  // application's `onSuccess` settles.
  const done = (to?: string) => {
    setActing((a) => a ?? SUBMIT)
    if (props.onSuccess) hold(props.onSuccess())
    else window.location.assign(sitePath(to) ?? sameOrigin(props.returnTo) ?? '/')
  }
  const root = useRoot(opts.part ? { ...props, unstyled: true } : props)
  const plain = props.unstyled === true
  return { t, cx, own, C, Button, Input, error, setError, fail, check, fieldError, firstWrong, busy, setBusy, loading, hold, say, done, root, plain, policy, setPolicy, passwordRule }
}

/** The key of the form's own submit, for `setBusy` and `loading`. */
const SUBMIT = 'submit'

type Form = ReturnType<typeof useForm>

/**
 * An element around the form's parts: the application's `Form` when it gave
 * one, otherwise the very element the forms have always drawn. `root` is the
 * outermost one's mark and look; with the application's own `Form` and a
 * look to wear, they go on a plain `div` around it, for `styles.css` to find.
 */
function Wrap(p: {
  f: Form; as: 'form' | 'div' | 'section'; slot?: Slot; root?: ReturnType<typeof useRoot>; section?: string
  onSubmit?: (e: FormEvent) => void; noValidate?: boolean; busy?: boolean; children?: ReactNode
}) {
  const { Form: OwnForm } = p.f.C
  // Busy while an action runs, or as the caller says (a step still opening).
  const busy = p.busy ?? (p.f.busy || undefined)
  if (OwnForm) {
    const own = (
      <OwnForm as={p.as === 'form' ? 'form' : 'div'} onSubmit={p.onSubmit} noValidate={p.noValidate} aria-busy={busy}
        className={p.slot ? p.f.own(p.slot) : undefined} section={p.section}>{p.children}</OwnForm>
    )
    return p.root?.['data-cauthy'] !== undefined ? <div {...p.root}>{own}</div> : own
  }
  const Tag = p.as
  // A form still opening, with nothing to show yet, says it is on its way.
  const children = p.busy && p.children === undefined ? <Pending f={p.f} /> : p.children
  return <Tag className={p.slot ? p.f.cx(p.slot) : undefined} {...p.root} onSubmit={p.onSubmit} noValidate={p.noValidate} aria-busy={busy}>{children}</Tag>
}

/**
 * Where a form waits before it can show anything: the spinner alone, no words,
 * centred by styles.css. The form around it says `aria-busy`. The
 * application's own `Form` is told `aria-busy` and draws its own.
 */
function Pending({ f }: { f: Form }) {
  return <div className={f.cx('pending')}><Spinner plain={f.plain} /></div>
}

// The parts every form draws with: the application's own when it gave one,
// otherwise the element the forms have always drawn, so nothing changes for
// an application that gives none.

/** A sentence the form says: help, a state. */
function Note({ f, children, footer }: { f: Form; children: ReactNode; footer?: boolean }) {
  const { Text } = f.C
  if (Text) return <Text as="p" tone="muted" size={footer ? 'sm' : 'md'}>{children}</Text>
  return <p className={f.cx(footer ? 'footer' : 'notice')}>{children}</p>
}

/** A part's heading. */
function Heading({ f, children }: { f: Form; children: ReactNode }) {
  const { Text } = f.C
  if (Text) return <Text as="h2" size="lg">{children}</Text>
  return <h2 className={f.cx('heading')}>{children}</h2>
}

/** What went wrong, or what was done: announced. */
function Say({ f, tone, children }: { f: Form; tone: AuthAlertProps['tone']; children: ReactNode }) {
  const { Alert } = f.C
  if (Alert) return <Alert tone={tone}>{children}</Alert>
  // Announced as they appear: assertive for what went wrong, polite for the rest.
  if (tone === 'danger') return <p role="alert" aria-live="assertive" aria-atomic="true" className={f.cx('error')}>{children}</p>
  return <p role="status" aria-live="polite" aria-atomic="true" className={f.cx('notice')}>{children}</p>
}

/** "or with your email", between the providers and the address. */
function Or({ f, children }: { f: Form; children: ReactNode }) {
  const { Divider } = f.C
  if (Divider) return <Divider label={children} />
  return <p className={f.cx('separator')}>{children}</p>
}

function A({ f, href, newTab, children }: { f: Form; href?: string; newTab?: boolean; children: ReactNode }) {
  const { Link } = f.C
  if (Link) return <Link href={href} newTab={newTab}>{children}</Link>
  return <a className={f.cx('link')} href={href} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener' : undefined}>{children}</a>
}

/** A mark beside a name; without the application's badge, the words as they always read. */
function Tag({ f, tone, children, plain }: { f: Form; tone?: AuthBadgeProps['tone']; children: ReactNode; plain: ReactNode }) {
  const { Badge } = f.C
  if (Badge) return <>{' '}<Badge tone={tone}>{children}</Badge></>
  return <>{plain}</>
}

function Check(p: { f: Form; name: string; checked: boolean; required?: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  const id = useId()
  const { f } = p
  const { Checkbox } = f.C
  if (Checkbox) {
    return <Checkbox id={id} name={p.name} checked={p.checked} required={p.required} disabled={f.busy} className={f.own('check')} onChange={p.onChange}>{p.children}</Checkbox>
  }
  return (
    <label className={f.cx('check')}>
      <input type="checkbox" name={p.name} checked={p.checked} required={p.required} disabled={f.busy} onChange={(e) => p.onChange(e.target.checked)} />
      <span>{p.children}</span>
    </label>
  )
}

function Pick(p: { f: Form; id?: string; name: string; value: string; options: { value: string; label: string }[]; disabled?: boolean; label?: string; onChange: (value: string) => void }) {
  const made = useId()
  const id = p.id ?? made
  const { f } = p
  const { Select } = f.C
  // Every control waits while an action runs.
  const disabled = p.disabled || f.busy
  if (Select) {
    return <Select id={id} name={p.name} value={p.value} options={p.options} disabled={disabled} aria-label={p.label} className={f.own('input')} onChange={p.onChange} />
  }
  return (
    <select id={id} name={p.name} aria-label={p.label} className={f.cx('input')} value={p.value} disabled={disabled} onChange={(e) => p.onChange(e.target.value)}>
      {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/** A label around a control that is not a text input: a role to give. */
function Labelled({ f, id, label, children }: { f: Form; id: string; label: string; children: ReactNode }) {
  const { Field: OwnField } = f.C
  if (OwnField) return <OwnField id={id} label={label} className={f.own('field')}>{children}</OwnField>
  return (
    <label className={f.cx('field')}>
      <span className={f.cx('label')}>{label}</span>
      {children}
    </label>
  )
}

/** "the Terms of Service and the Privacy Policy", each linked, opening apart. */
function Documents({ f, documents }: { f: Form; documents: { kind: string; url: string }[] }) {
  return (
    <>
      {documents.map((d, i) => (
        <span key={d.kind}>
          {i > 0 && <>{f.t.and} </>}
          <A f={f} href={d.url} newTab>{d.kind === 'terms' ? f.t.termsOfService : f.t.privacyPolicy}</A>{' '}
        </span>
      ))}
    </>
  )
}

const PASSWORD_RULES = ['needs_lowercase', 'needs_uppercase', 'needs_digit', 'needs_symbol', 'needs_classes', 'breached']

/** A new password refused by a rule of the workspace's policy, here or by Cauthy. */
function isPasswordRule(e: AuthError): boolean {
  if (e.code === 'weak_password' || PASSWORD_RULES.includes(e.code)) return true
  return (e.code === 'too_short' || e.code === 'too_long') && (e.field === 'password' || e.field === 'newPassword')
}

/**
 * A new password the workspace's rule refuses, as the form says it: every
 * rule it fails, under the field it was typed in.
 */
function newPasswordProblem(value: string, policy: PasswordPolicy | undefined, field: 'password' | 'newPassword' = 'password'): AuthError | null {
  const bad = checkNewPassword(value, policy)
  if (!bad) return null
  return { code: bad.code, message: bad.message, field, ...(bad.code === 'required' ? {} : { reasons: passwordProblems(value, policy) }) }
}

/** The workspace's password rule, into a form, once methods() has said it. */
function usePasswordPolicy(f: ReturnType<typeof useForm>, methods: AuthMethods | null) {
  const { setPolicy } = f
  useEffect(() => {
    if (methods?.password) setPolicy(methods.password)
  }, [methods, setPolicy])
}

function Field(p: {
  f: ReturnType<typeof useForm>; name: 'email' | 'password' | 'newPassword' | 'name' | 'code' | 'phone' | 'organization'; type: string; label: string; value: string
  autoComplete: string; required?: boolean; onChange: (v: string) => void; aside?: ReactNode
  /** A line under the field saying what it takes (a new password's rule). */
  hint?: string
}) {
  const id = useId()
  const { f } = p
  const bad = f.fieldError(p.name)
  // The first field found wrong takes the focus, on every try.
  const focus = f.firstWrong(p.name)
  useEffect(() => {
    if (focus > 0 && typeof document !== 'undefined') document.getElementById(id)?.focus()
  }, [focus, id])
  const described = [bad ? `${id}-error` : '', p.hint ? `${id}-hint` : ''].filter(Boolean).join(' ')
  const input = (
    <f.Input id={id} name={p.name} type={p.type} value={p.value} autoComplete={p.autoComplete} required={p.required} disabled={f.busy} className={f.cx('input')}
      aria-invalid={bad ? true : undefined} aria-describedby={described || undefined} onChange={(e) => p.onChange(e.target.value)} />
  )
  const { Field: OwnField } = f.C
  if (OwnField) {
    return (
      <OwnField id={id} label={p.label} aside={p.aside} help={p.hint && !bad ? p.hint : undefined} error={bad ? f.say(bad) : undefined}
        required={p.required} className={f.own('field')}>{input}</OwnField>
    )
  }
  return (
    <div className={f.cx('field')}>
      <label className={f.cx('label')} htmlFor={id}>{p.label}{p.aside}</label>
      {input}
      {p.hint && !bad && <span id={`${id}-hint`} className={f.cx('hint')}>{p.hint}</span>}
      {bad && <span id={`${id}-error`} role="alert" aria-live="assertive" className={f.cx('fieldError')}>{f.say(bad)}</span>}
    </div>
  )
}

/** The error a provider's trip came back with, read once from the address. */
function returnedError(): AuthError | null {
  if (typeof window === 'undefined') return null
  const code = new URLSearchParams(window.location.search).get('auth_error')
  return code ? { code, message: 'That sign-in could not be completed. Try again.' } : null
}

/**
 * The token a mailed link opened this page with, taken out of the address so
 * it is not left in the history or sent on as a referrer.
 */
function takeToken(name: string): string | null {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  const token = url.searchParams.get(name)
  if (token === null) return null
  url.searchParams.delete(name)
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  return token
}

/**
 * Runs `open` once with the token this page was opened with, or with null.
 * Once per page, even where React runs an effect twice while developing: the
 * token is taken out of the address the first time and a link works once.
 */
function useMailedToken(name: string, open: (token: string | null) => void): void {
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current) return
    opened.current = true
    open(takeToken(name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * The second step of a sign-in, once Cauthy asked for it: the code of the
 * authenticator app, a code sent to the phone or the email, or a push
 * approved on the phone. `<SignIn />` and `<AcceptInvite />` both end here.
 */
function SecondStepForm(p: { f: ReturnType<typeof useForm>; auth: ReturnType<typeof useAuth> }) {
  const { f, auth } = p
  const [code, setCode] = useState('')
  // The ways the account takes the step, and where a code went.
  const [phoneWay, setPhoneWay] = useState<{ totp: boolean; phone: { number: string; channel: string } | null; push: { devices: number } | null; email: { to: string } | null } | null>(null)
  const [phoneSent, setPhoneSent] = useState('')
  useEffect(() => {
    void auth.signIn.mfaMethods().then((r) => { if (r.ok) setPhoneWay({ totp: r.totp, phone: r.phone, push: r.push, email: r.email }) })
    // Once: asked when the step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // The second step by email: the code went with the first step; another can be asked for.
  const sendEmail = async () => {
    f.setBusy('email')
    f.setError(null)
    const r = await auth.signIn.mfaSendEmail()
    f.setBusy(false)
    if (!r.ok) return f.setError(r.error)
    setPhoneSent(r.sentTo)
  }
  // The second step approved on the phone: the number to pick, while the page listens.
  const [pushNumber, setPushNumber] = useState(0)
  const pushWait = useRef<AbortController | null>(null)
  useEffect(() => () => pushWait.current?.abort(), [])
  const sendPush = async () => {
    f.setBusy('push')
    f.setError(null)
    const r = await auth.signIn.mfaPush()
    f.setBusy(false)
    if (!r.ok) return f.setError(r.error)
    setPushNumber(r.number)
    pushWait.current?.abort()
    const ctl = new AbortController()
    pushWait.current = ctl
    const done = await auth.signIn.mfaPushWait({ signal: ctl.signal })
    if (ctl.signal.aborted) return
    setPushNumber(0)
    if (!done.ok) return f.setError(done.error)
    // Approved: its button says the sign-in goes on, until the page is left.
    f.setBusy('push')
    f.done()
  }
  const sendCode = async () => {
    f.setBusy('phone')
    f.setError(null)
    const r = await auth.signIn.mfaSendCode()
    f.setBusy(false)
    if (!r.ok) return f.setError(r.error)
    setPhoneSent(r.sentTo)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    f.setBusy(true)
    f.setError(null)
    const r = await auth.signIn.mfa({ code })
    // Signed in: the form stays busy until it leaves (see `done`).
    if (!r.ok) return f.fail(r.error)
    f.done()
  }
  const general = f.error && !f.error.field ? f.error : null
  const to = phoneWay?.phone?.number ?? ''
  return (
    <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
      <Note f={f}>{phoneSent ? f.t.codeSent.replace('{to}', phoneSent) : phoneWay?.email ? f.t.codeHelpEmail.replace('{to}', phoneWay.email.to) : phoneWay?.phone && !phoneWay.totp ? f.t.codeHelpPhone : f.t.codeHelp}</Note>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      {phoneWay?.email && (
        <f.Button type="button" variant="secondary" loading={f.loading('email')} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void sendEmail()}>{f.t.sendEmailAgain}</f.Button>
      )}
      {pushNumber > 0 ? (f.C.Text ? (
        // The application's text: the number to pick drawn large, by its own rules.
        <div role="status" aria-live="polite">
          <f.C.Text as="p">{f.t.pushPick.replace('{n}', String(pushNumber))}</f.C.Text>
          <f.C.Text as="p" size="lg">{pushNumber}</f.C.Text>
          <f.C.Text as="p" tone="muted">{f.t.pushWaiting}</f.C.Text>
        </div>
      ) : (
        <div className={f.cx('notice')} role="status" aria-live="polite">
          <p>{f.t.pushPick.replace('{n}', String(pushNumber))}</p>
          <p style={{ fontSize: 48, fontWeight: 700, margin: '4px 0', textAlign: 'center' }}>{pushNumber}</p>
          <p>{f.t.pushWaiting}</p>
        </div>
      )) : phoneWay?.push && (
        <f.Button type="button" variant="secondary" loading={f.loading('push')} disabled={f.busy} className={f.cx('button')} onClick={() => void sendPush()}>{f.t.pushSend}</f.Button>
      )}
      {phoneWay?.phone && (
        <f.Button type="button" variant="secondary" loading={f.loading('phone')} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void sendCode()}>
          {(phoneWay.phone.channel === 'whatsapp' ? f.t.sendCodeWhatsapp : f.t.sendCodeSms).replace('{to}', to)}
        </f.Button>
      )}
      <Field f={f} name="code" type="text" label={f.t.code} value={code} autoComplete="one-time-code" required onChange={setCode} />
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.verify}</f.Button>
    </Wrap>
  )
}

/**
 * "Continue with …", one button per provider the workspace turned on, each
 * with the provider's logo when Cauthy serves one. The logo says nothing a
 * screen reader needs: the button's words name the provider.
 */
export function ProviderButtons(p: { f: ReturnType<typeof useForm>; providers: AuthMethods['providers']; onPick: (id: string) => void }) {
  const { f } = p
  // On the way to the provider: the button pressed loads, and the form waits
  // until the page is left.
  const pick = (id: string) => {
    f.setBusy(`provider:${id}`)
    p.onPick(id)
  }
  return (
    <>
      {p.providers.map((provider) => (
        <f.Button key={provider.id} type="button" variant="secondary" loading={f.loading(`provider:${provider.id}`)} disabled={f.busy} className={f.cx('providerButton')} onClick={() => pick(provider.id)}>
          {provider.iconUrl && <img src={provider.iconUrl} alt="" width={18} height={18} className={f.cx('providerIcon')} />}
          {f.t.continueWith} {provider.name}
        </f.Button>
      ))}
    </>
  )
}

/**
 * What `<SignIn />` offers, from what the workspace turned on: the password
 * (and with it "forgot your password"), the address (asked for the password,
 * a sign-in link, or finding the person's company) and the passkey button.
 * Until `methods()` answers, the usual form: a password and an address.
 */
export function signInOffers(methods: AuthMethods | null): { password: boolean; email: boolean; passkey: boolean } {
  const password = methods?.passwordSignIn !== false
  return { password, email: password || methods?.magicLink === true || methods?.sso === true, passkey: methods?.passkey === true }
}

export function SignIn(props: AuthFormProps) {
  const auth = useAuth()
  const [methods, setMethods] = useState<AuthMethods | null>(null)
  // Until the workspace says what it offers, the form shows but waits: nothing
  // to press or type that the answer could still change.
  const f = useForm(props, { waiting: methods === null })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  // "Keep me signed in": offered when the client allows it; the ref is for the autofill, which starts before it is ticked.
  const [remember, setRemember] = useState(false)
  const rememberNow = useRef(false)
  rememberNow.current = remember && methods?.persistentSessions === true
  // 'link': the sign-in link's own step, opened from the quick ways in.
  const [step, setStep] = useState<'password' | 'link' | 'code' | 'opening' | 'sent'>('password')
  const challenge = useChallenge(methods?.captchaSiteKey, props.locale)
  const offers = signInOffers(methods)
  // A workspace that turned the password off: no password field, no "forgot
  // your password". Until methods() answers, the form is the usual one.
  const passwordOn = offers.password
  // The passkeys offered in the email field's autofill, while the form waits.
  const autofill = useRef<AbortController | null>(null)
  const [offer, setOffer] = useState(0)
  // The person's company, when the address typed is one of its domains.
  const [company, setCompany] = useState<SSOConnection | null>(null)
  useEffect(() => {
    if (!methods?.sso || checkEmail(email) !== null) return setCompany(null)
    let current = true
    const t = setTimeout(() => {
      void auth.signIn.ssoDiscover({ email }).then((r) => { if (current) setCompany(r.ok && r.status === 'found' ? r.connection : null) })
    }, 350)
    return () => { current = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, methods])
  const toCompany = () => {
    autofill.current?.abort()
    f.setBusy('sso')
    auth.signIn.sso({ email }, { returnTo: props.returnTo, remember: rememberNow.current })
  }

  useEffect(() => {
    void auth.methods().then(setMethods)
    const back = returnedError()
    if (back) f.setError(back)
    // Once: what the workspace offers does not change while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Opened from a sign-in link: the token signs the person in.
  useMailedToken('ml_token', (token) => {
    if (!token) return
    setStep('opening')
    // The link carries where the person was going (`return_to`) and whether to stay signed in (`remember`).
    const query = new URLSearchParams(window.location.search)
    void auth.signIn.magicLinkVerify({ token, remember: query.get('remember') === '1' }).then((r) => {
      if (r.ok) return f.done(query.get('return_to') ?? undefined)
      f.setError(r.error)
      setStep('password')
    })
  })

  useEffect(() => {
    if (step !== 'password' || !methods?.passkeyHere) return
    const ctl = new AbortController()
    autofill.current = ctl
    void auth.signIn.passkeyAutofill({ signal: ctl.signal, remember: () => rememberNow.current }).then((r) => {
      if (ctl.signal.aborted) return
      if (r.ok) return f.done()
      if (r.error.code === 'cancelled') return // nothing to offer here
      f.setError(r.error)
      // A passkey that failed: offer them again, for another try.
      if (r.error.code === 'passkey_failed' || r.error.code === 'step_expired') setOffer((n) => n + 1)
    })
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, methods, offer])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    autofill.current?.abort()
    // An address its company holds to SSO has nothing else to send.
    if (step === 'password' && company?.enforced) {
      f.setError(null)
      return toCompany()
    }
    // The sign-in link's own step: the link, unless the company holds the address.
    if (step === 'link') {
      if (company?.enforced) return toCompany()
      if (f.check(checkEmail(email))) return sendLink()
      return
    }
    // No password to send: the address asks for a link, when the workspace mails them.
    if (step === 'password' && !passwordOn) {
      if (company) return toCompany()
      if (methods?.magicLink && f.check(checkEmail(email))) return sendLink()
      return
    }
    // Every field the step shows, checked at once.
    if (step === 'password' && !f.check(checkEmail(email), checkPassword(password))) return
    f.setBusy(true)
    f.setError(null)
    const r = step === 'sent' ? await auth.signIn.emailCode({ code }) : await auth.signIn.email({ email, password, captchaToken: challenge.token, remember: rememberNow.current })
    if (step === 'password') challenge.renew()
    if (!r.ok && r.error.code === 'sso_required') return toCompany()
    if (!r.ok) {
      setOffer((n) => n + 1)
      return f.fail(r.error)
    }
    if (r.status === 'mfa_required') {
      // The password has done its work: the second step needs only a code.
      setPassword('')
      f.setBusy(false)
      return setStep('code')
    }
    f.done('returnTo' in r && typeof r.returnTo === 'string' ? r.returnTo : undefined)
  }
  const usePasskey = async () => {
    // The browser asks for one passkey at a time.
    autofill.current?.abort()
    f.setBusy('passkey')
    f.setError(null)
    const r = await auth.signIn.passkey({ returnTo: props.returnTo, locale: props.locale, email, remember: rememberNow.current })
    // On its way to Cauthy's page, or signed in: the form waits until it leaves.
    if (r.ok && r.status === 'redirected') return
    if (r.ok) return f.done()
    f.setBusy(false)
    setOffer((n) => n + 1)
    // The person closed the browser's prompt: nothing to say.
    if (r.error.code !== 'cancelled') f.setError(r.error)
  }
  const sendLink = async () => {
    autofill.current?.abort()
    f.setBusy('link')
    f.setError(null)
    const r = await auth.signIn.magicLink({ email, captchaToken: challenge.token, create: props.createAccounts, returnTo: props.returnTo, remember: rememberNow.current })
    f.setBusy(false)
    challenge.renew()
    if (!r.ok && r.error.code === 'sso_required') return toCompany()
    if (!r.ok) return f.setError(r.error)
    setStep('sent')
  }
  // The sign-in link's step, with the address typed so far.
  const openLink = () => {
    autofill.current?.abort()
    f.setError(null)
    setStep('link')
  }
  const general = f.error && !f.error.field ? f.error : null
  const asksEmail = offers.email

  if (step === 'opening') return <Wrap f={f} as="div" slot="form" root={f.root} busy />
  if (step === 'sent') {
    return (
      <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
        <Note f={f}>{f.t.signInLinkSent}</Note>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        <Note f={f}>{f.t.codeFromMail}</Note>
        <Field f={f} name="code" type="text" label={f.t.code} value={code} autoComplete="one-time-code" required onChange={setCode} />
        <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.verify}</f.Button>
      </Wrap>
    )
  }
  if (step === 'code') return <SecondStepForm f={f} auth={auth} />
  // The sign-in link, asked from the quick ways in: the address (the one
  // typed in the form, if any) and the button that sends it.
  if (step === 'link') {
    return (
      <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        <Note f={f}>{f.t.linkHelp}</Note>
        <Field f={f} name="email" type="email" label={f.t.email} value={email} autoComplete="username" required onChange={setEmail} />
        {challenge.node}
        <f.Button type="submit" variant="primary" loading={f.loading('link')} disabled={f.busy} className={f.cx('button')}>{f.t.sendMeTheLink}</f.Button>
        <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => { f.setError(null); setStep('password') }}>{f.t.back}</f.Button>
      </Wrap>
    )
  }
  // The quick ways in come first: the passkey, the providers, the sign-in
  // link (opening its own step). Then "or", and the address and password.
  // Without the password, the address below is the sign-in link's.
  const quickLink = methods?.magicLink === true && passwordOn
  const keep = methods?.persistentSessions === true && (
    <Check f={f} name="remember" checked={remember} onChange={setRemember}>{f.t.keepSignedIn}</Check>
  )
  const quick = offers.passkey || (methods?.providers.length ?? 0) > 0 || quickLink
  return (
    <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      {/* Once, above every way in: ticked before a provider or the passkey is chosen, it counts. */}
      {keep}
      {offers.passkey && (
        <f.Button type="button" variant="secondary" loading={f.loading('passkey')} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void usePasskey()}>{f.t.usePasskey}</f.Button>
      )}
      <ProviderButtons f={f} providers={methods?.providers ?? []} onPick={(id) => auth.signIn.social(id, { returnTo: props.returnTo, remember: rememberNow.current })} />
      {quickLink && (
        <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={openLink}>{f.t.emailMeALink}</f.Button>
      )}
      {asksEmail && quick && <Or f={f}>{f.t.orWithEmail}</Or>}
      {asksEmail && (
        <Field f={f} name="email" type="email" label={f.t.email} value={email} autoComplete={methods?.passkeyHere ? 'username webauthn' : 'username'} required onChange={setEmail} />
      )}
      {company && (
        <f.Button type="button" variant={company.enforced ? 'primary' : 'secondary'} loading={f.loading('sso')} disabled={f.busy} className={f.cx(company.enforced ? 'button' : 'providerButton')} onClick={toCompany}>
          {f.t.continueWith} {company.name}
        </f.Button>
      )}
      {company?.enforced && <Note f={f}>{f.t.ssoOnly}</Note>}
      {!company?.enforced && passwordOn && (
        <>
          <Field f={f} name="password" type="password" label={f.t.password} value={password} autoComplete="current-password" required onChange={setPassword}
            aside={props.links?.forgotPassword ? <A f={f} href={props.links.forgotPassword}>{f.t.forgotPassword}</A> : undefined} />
          {challenge.node}
          <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.signIn}</f.Button>
        </>
      )}
      {/* Without the password, the address asks for the sign-in link. */}
      {!company?.enforced && !passwordOn && methods?.magicLink && (
        <>
          {challenge.node}
          <f.Button type="submit" variant="primary" loading={f.loading('link')} disabled={f.busy} className={f.cx('button')}>{f.t.sendMeTheLink}</f.Button>
        </>
      )}
      {methods?.signUp !== false && props.links?.signUp && (
        <Note f={f} footer>{f.t.noAccount} <A f={f} href={props.links.signUp}>{f.t.createAccount}</A></Note>
      )}
    </Wrap>
  )
}

export interface GoogleOneTapProps {
  /** Where to go once signed in. Without it (and without `onSuccess`), the page stays and its session updates. */
  returnTo?: string
  /** Called once signed in, instead of going to `returnTo`. */
  onSuccess?: () => void
  /** The prompt's words: sign in (default), sign up, or use the application. */
  context?: 'signin' | 'signup' | 'use'
  /** Whether the person asked to stay signed in, read when they tap. */
  remember?: () => boolean
}

/**
 * Google One Tap: put it on any page, and a person who is not signed in sees
 * Google's prompt with the Google account the browser has; one tap signs them
 * in. It draws nothing of its own, and shows nothing to somebody signed in or
 * where the workspace has no Google sign-in.
 */
export function GoogleOneTap(props: GoogleOneTapProps) {
  const auth = useAuth()
  const unauthenticated = auth.status === 'unauthenticated'
  useEffect(() => {
    if (!unauthenticated) return
    const ctl = new AbortController()
    void auth.signIn.googleOneTap({ signal: ctl.signal, context: props.context, remember: props.remember }).then((r) => {
      if (!r.ok || ctl.signal.aborted) return
      if (props.onSuccess) props.onSuccess()
      else {
        const to = sameOrigin(props.returnTo)
        if (to) window.location.assign(to)
      }
    })
    return () => ctl.abort()
    // Once per signed-out visit: the prompt is not shown again on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unauthenticated])
  return null
}

export function SignUp(props: AuthFormProps) {
  const auth = useAuth()
  const f = useForm(props)
  const [name, setName] = useState('')
  const [organization, setOrganization] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const methods = useMethods(auth)
  usePasswordPolicy(f, methods)
  const challenge = useChallenge(methods?.captchaSiteKey, props.locale)
  // The law's boxes: the documents accepted, and each consent asked.
  const [acceptLegal, setAcceptLegal] = useState(false)
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const legal = methods?.legal

  const guest = auth.session?.user.isAnonymous === true
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    // Every field at once, in the order they are drawn.
    const asksCompany = methods?.organization?.ask === true
    if (!f.check(
      asksCompany && checkOrganization(organization, methods?.organization?.required === true),
      checkName(name), checkEmail(email), newPasswordProblem(password, f.policy),
    )) return
    f.setBusy(true)
    f.setError(null)
    // A guest signing up becomes the account they were using: same id.
    const r = guest
      ? await auth.account.upgrade({ name, email, password })
      : await auth.signUp.email({ name, email, password, ...(methods?.organization?.ask ? { organization } : {}),
        ...(legal ? { acceptLegal, consents } : {}), captchaToken: challenge.token })
    challenge.renew()
    if (!r.ok) return f.fail(r.error)
    if (r.status === 'verification_required') {
      f.setBusy(false)
      return setSent(true)
    }
    f.done()
  }
  const general = f.error && !f.error.field ? f.error : null
  // A workspace that turned the password off makes accounts through its
  // providers only. Not offered to a guest becoming an account (the provider
  // would sign them in as another), nor where the sign-up must name its
  // company: a provider has no field for it.
  const passwordOn = methods?.passwordSignIn !== false
  const providers = guest || methods?.organization?.required ? [] : (methods?.providers ?? [])

  if (sent) {
    return (
      <Wrap f={f} as="div" slot="form" root={f.root}>
        <Note f={f}>{f.t.checkEmail}</Note>
        {props.links?.signIn && <A f={f} href={props.links.signIn}>{f.t.backToSignIn}</A>}
      </Wrap>
    )
  }
  // Until the workspace says what it asks (a company's name, the password,
  // the legal boxes), the form waits: its fields would move as they came.
  if (methods === null) return <Wrap f={f} as="div" slot="form" root={f.root} busy />
  const footer = props.links?.signIn && <Note f={f} footer>{f.t.haveAccount} <A f={f} href={props.links.signIn}>{f.t.signIn}</A></Note>
  if (!passwordOn) {
    return (
      <Wrap f={f} as="div" slot="form" root={f.root}>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        <ProviderButtons f={f} providers={providers} onPick={(id) => auth.signIn.social(id, { returnTo: props.returnTo })} />
        {footer}
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <ProviderButtons f={f} providers={providers} onPick={(id) => auth.signIn.social(id, { returnTo: props.returnTo })} />
      {providers.length > 0 && <Or f={f}>{f.t.orWithEmail}</Or>}
      {methods.organization?.ask && (
        <Field f={f} name="organization" type="text" label={f.t.company} value={organization} autoComplete="organization" required={methods.organization.required} onChange={setOrganization} />
      )}
      <Field f={f} name="name" type="text" label={f.t.name} value={name} autoComplete="name" onChange={setName} />
      <Field f={f} name="email" type="email" label={f.t.email} value={email} autoComplete="username" required onChange={setEmail} />
      <Field f={f} name="password" type="password" label={f.t.password} value={password} autoComplete="new-password" required onChange={setPassword} hint={f.passwordRule} />
      {legal && legal.documents.length > 0 && (
        <Check f={f} name="acceptLegal" checked={acceptLegal} required onChange={setAcceptLegal}>
          {f.t.iAccept}{' '}
          <Documents f={f} documents={legal.documents} />
        </Check>
      )}
      {legal?.consentPurposes.map((p) => (
        <Check key={p.key} f={f} name={`consent_${p.key}`} checked={consents[p.key] === true} required={p.required} onChange={(on) => setConsents({ ...consents, [p.key]: on })}>
          {p.label}
        </Check>
      ))}
      {challenge.node}
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.signUp}</f.Button>
      {footer}
    </Wrap>
  )
}

export function ForgotPassword(props: AuthFormProps) {
  const auth = useAuth()
  const f = useForm(props)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const challenge = useChallenge(useMethods(auth)?.captchaSiteKey, props.locale)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    f.setBusy(true)
    f.setError(null)
    const r = await auth.forgotPassword({ email, captchaToken: challenge.token })
    f.setBusy(false)
    challenge.renew()
    if (!r.ok) return f.setError(r.error)
    setSent(true)
  }
  const general = f.error && !f.error.field ? f.error : null

  if (sent) {
    return (
      <Wrap f={f} as="div" slot="form" root={f.root}>
        <Note f={f}>{f.t.linkSent}</Note>
        {props.links?.signIn && <A f={f} href={props.links.signIn}>{f.t.backToSignIn}</A>}
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <Field f={f} name="email" type="email" label={f.t.email} value={email} autoComplete="username" required onChange={setEmail} />
      {challenge.node}
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.sendLink}</f.Button>
      {props.links?.signIn && <Note f={f} footer><A f={f} href={props.links.signIn}>{f.t.backToSignIn}</A></Note>}
    </Wrap>
  )
}

/** The page a "choose a new password" link opens: `pages.resetPassword`. */
export function ResetPassword(props: AuthFormProps) {
  const auth = useAuth()
  const f = useForm(props)
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [changed, setChanged] = useState(false)
  usePasswordPolicy(f, useMethods(auth))

  useMailedToken('token', (t) => {
    setToken(t ?? '')
    if (!t) f.setError({ code: 'invalid_token', message: 'This link is not valid, or it has expired.' })
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    f.setBusy(true)
    f.setError(null)
    const r = await auth.resetPassword({ token: token ?? '', password })
    f.setBusy(false)
    if (!r.ok) return f.setError(r.error)
    setChanged(true)
  }
  const general = f.error && !f.error.field ? f.error : null
  const back = props.links?.signIn && <A f={f} href={props.links.signIn}>{f.t.backToSignIn}</A>

  if (changed) {
    return (
      <Wrap f={f} as="div" slot="form" root={f.root}>
        <Note f={f}>{f.t.passwordChanged}</Note>
        {back}
      </Wrap>
    )
  }
  if (token === '') {
    return (
      <Wrap f={f} as="div" slot="form" root={f.root}>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        {props.links?.forgotPassword && <A f={f} href={props.links.forgotPassword}>{f.t.forgotPassword}</A>}
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <Field f={f} name="password" type="password" label={f.t.newPassword} value={password} autoComplete="new-password" required onChange={setPassword} hint={f.passwordRule} />
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy || token === null} className={f.cx('button')}>{f.t.savePassword}</f.Button>
    </Wrap>
  )
}

/** The page a "confirm your address" link opens: `pages.verifyEmail`. It confirms as it opens. */
export function VerifyEmail(props: AuthFormProps) {
  const auth = useAuth()
  const f = useForm(props)
  const [state, setState] = useState<'confirming' | 'confirmed' | 'failed'>('confirming')

  useMailedToken('token', (token) => {
    if (!token) {
      f.setError({ code: 'invalid_token', message: 'This link is not valid, or it has expired.' })
      return setState('failed')
    }
    void auth.verifyEmail({ token }).then((r) => {
      // Signed in from the link: on to the application, nothing more to type.
      if (r.ok && r.status === 'signed_in') return f.done()
      if (r.ok) return setState('confirmed')
      f.setError(r.error)
      setState('failed')
    })
  })

  return (
    <Wrap f={f} as="div" slot="form" root={f.root} busy={state === 'confirming'}>
      {state === 'confirming' && <Note f={f}>{f.t.confirming}</Note>}
      {state === 'confirmed' && <Note f={f}>{f.t.emailConfirmed}</Note>}
      {state === 'failed' && f.error && <Say f={f} tone="danger">{f.say(f.error)}</Say>}
      {state !== 'confirming' && props.links?.signIn && <A f={f} href={props.links.signIn}>{f.t.backToSignIn}</A>}
    </Wrap>
  )
}

/**
 * The page an invitation opens: `pages.acceptInvite`. It says who is invited
 * to what, asks for a password under the workspace's policy, signs the person
 * in (with the second step, when their account owes one) and goes on to
 * `returnTo`. The invitation is good until it is accepted: reading it, or a
 * password refused, does not spend it.
 */
/** What `<AcceptInvite />` tells the application once the invitation is accepted. */
export type AcceptInviteEvent = { kind: 'invitation.accepted'; email: string; organization?: string }

export interface AcceptInviteProps extends AuthFormProps {
  /** Called once the invitation is accepted, before the second step when the account owes one. */
  onSaved?: (event: AcceptInviteEvent) => void
}

export function AcceptInvite(props: AcceptInviteProps) {
  const auth = useAuth()
  const f = useForm(props)
  const [token, setToken] = useState('')
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [state, setState] = useState<'opening' | 'ready' | 'invalid' | 'code'>('opening')
  const [password, setPassword] = useState('')
  usePasswordPolicy(f, useMethods(auth))

  useMailedToken('token', (t) => {
    if (!t) return setState('invalid')
    setToken(t)
    void auth.invitation(t).then((r) => {
      if (r.ok) {
        setInvitation(r.invitation)
        return setState('ready')
      }
      // A spent or unknown invitation says so; anything else, what it was.
      if (r.error.code !== 'invalid_token') f.setError(r.error)
      setState('invalid')
    })
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    f.setBusy(true)
    f.setError(null)
    const r = await auth.acceptInvitation(token, password)
    if (!r.ok) {
      f.setBusy(false)
      if (r.error.code === 'invalid_token') return setState('invalid')
      return f.setError(r.error)
    }
    props.onSaved?.({ kind: 'invitation.accepted', email: invitation?.email ?? '', ...(invitation?.organization ? { organization: invitation.organization } : {}) })
    if (r.status === 'mfa_required') {
      f.setBusy(false)
      return setState('code')
    }
    f.done()
  }
  const general = f.error && !f.error.field ? f.error : null
  const back = props.links?.signIn && <A f={f} href={props.links.signIn}>{f.t.backToSignIn}</A>

  if (state === 'opening') {
    return (
      <Wrap f={f} as="div" slot="form" root={f.root} busy>
        <Note f={f}>{f.t.openingInvitation}</Note>
      </Wrap>
    )
  }
  if (state === 'invalid') {
    return (
      <Wrap f={f} as="div" slot="form" root={f.root}>
        <Say f={f} tone="danger">{general ? f.say(general) : f.t.invitationInvalid}</Say>
        {back}
      </Wrap>
    )
  }
  if (state === 'code') return <SecondStepForm f={f} auth={auth} />
  const workspace = invitation?.workspace ?? ''
  const heading = invitation?.organization
    ? f.t.invitedToOrganization.replace('{organization}', invitation.organization).replace('{workspace}', workspace)
    : f.t.invitedTo.replace('{workspace}', workspace)
  return (
    <Wrap f={f} as="form" slot="form" root={f.root} onSubmit={submit} noValidate>
      <Heading f={f}>{heading}</Heading>
      <Note f={f}>{f.t.invitedAs.replace('{email}', invitation?.email ?? '')}</Note>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      {/* The address, for the browser's password manager to keep the new password under. */}
      <input type="email" name="username" autoComplete="username" value={invitation?.email ?? ''} readOnly hidden />
      <Field f={f} name="password" type="password" label={f.t.choosePassword} value={password} autoComplete="new-password" required onChange={setPassword} hint={f.passwordRule} />
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.acceptInvite}</f.Button>
    </Wrap>
  )
}

export interface PendingTermsProps extends Omit<AuthFormProps, 'links' | 'returnTo' | 'createAccounts'> {
  /**
   * Called once the person accepted. Nothing else happens: the application
   * decides what follows. A Promise keeps the button loading until it settles.
   */
  onSuccess?: () => void | Promise<unknown>
}

/**
 * The legal documents the signed-in person still owes (a new version of the
 * terms, say), linked, with the action that accepts them. It shows nothing
 * while it reads them, when nothing is owed, and once they are accepted.
 * Nothing stops the person meanwhile: the application decides what waits.
 */
export function PendingTerms(props: PendingTermsProps) {
  const auth = useAuth()
  const f = useForm(props)
  const [owed, setOwed] = useState<PendingLegal[] | null>(null)
  useEffect(() => {
    void auth.account.legal().then((r) => setOwed(r.ok ? r.pending : []))
    // Once: what is owed is read when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!owed || owed.length === 0) return null
  const accept = async () => {
    f.setBusy(true)
    f.setError(null)
    const r = await auth.account.acceptLegal({ kinds: owed.map((d) => d.kind) })
    if (!r.ok) return f.fail(r.error)
    // The application's own way on, when it waits for it: the button loads until then.
    const after = props.onSuccess?.()
    if (isPending(after)) await Promise.resolve(after).catch(() => undefined)
    f.setBusy(false)
    setOwed([])
  }
  return (
    <Wrap f={f} as="div" slot="form" root={f.root}>
      <Heading f={f}>{f.t.termsChanged}</Heading>
      <Note f={f}>{f.t.termsChangedHelp}{' '}<Documents f={f} documents={owed} /></Note>
      {f.error && <Say f={f} tone="danger">{f.say(f.error)}</Say>}
      <f.Button type="button" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')} onClick={() => void accept()}>{f.t.acceptTerms}</f.Button>
    </Wrap>
  )
}

/** The parts of `<Account />`, by name: what `sections` lists. */
export type AccountSection = 'profile' | 'email' | 'password' | 'linked' | 'secondStep' | 'phone' | 'passkeys' | 'agents' | 'sessions'

const ACCOUNT_SECTIONS: AccountSection[] = ['profile', 'email', 'password', 'linked', 'secondStep', 'phone', 'passkeys', 'agents', 'sessions']

/**
 * What `<Account />` tells the application after each change it saved, for
 * the application's own toast or its own data to follow.
 */
export type AccountEvent =
  | { kind: 'profile.saved'; name: string }
  | { kind: 'email.change_requested'; email: string }
  | { kind: 'password.changed' }
  | { kind: 'identity.linked'; provider: string }
  | { kind: 'identity.unlinked'; provider: string }
  | { kind: 'mfa.enabled' }
  | { kind: 'mfa.disabled' }
  | { kind: 'recovery_codes.regenerated' }
  | { kind: 'phone.added'; channel: 'sms' | 'whatsapp' }
  | { kind: 'phone.removed' }
  | { kind: 'passkey.added'; id: string }
  | { kind: 'passkey.removed'; id: string }
  | { kind: 'agent.disconnected'; id: string }
  | { kind: 'sessions.ended' }

export interface AccountProps extends Omit<AuthFormProps, 'links' | 'returnTo' | 'onSuccess'> {
  /** Called after "sign out everywhere". Default: go to `/`. A Promise keeps the button loading until it settles. */
  onSignedOut?: () => void | Promise<unknown>
  /** The moment of a session, as the application writes dates. Default: the browser's own way, in the reader's time zone. */
  formatDate?: (iso: string) => string
  /**
   * The parts shown, in this order. Default: all of them, as listed in
   * `AccountSection`. A part with nothing to show (the password of an account
   * without one, agents when none is connected) stays out either way.
   */
  sections?: AccountSection[]
  /** Called after every change saved, with what changed. */
  onSaved?: (event: AccountEvent) => void
}

/** One part of the account screen: its own form, its own error, its own "saved". */
function useSection(props: AccountProps) {
  // The look is the account screen's, around every part: not read again here.
  const f = useForm(props, { part: true })
  const [done, setDone] = useState<string | null>(null)
  // `key`: the button the action belongs to, the one that says it loads.
  // `leaves`: done, the action leaves the page; the part stays busy (see `hold`).
  const run = async <T extends { ok: boolean }>(action: () => Promise<T>, key: string = SUBMIT, leaves = false): Promise<T> => {
    f.setBusy(key)
    f.setError(null)
    setDone(null)
    const r = await action()
    if (!r.ok) f.fail((r as unknown as { error: AuthError }).error)
    else if (!leaves) f.setBusy(false)
    return r
  }
  const general = f.error && !f.error.field ? f.error : null
  return { f, done, setDone, run, general }
}

/**
 * The signed-in person's account, in the application: their name, their
 * password, the second step, and where they are signed in. Each part saves on
 * its own. Like the other forms, it carries no styles.
 */
export function Account(props: AccountProps) {
  const auth = useAuth()
  const { accountUrl } = useSession()
  const f = useForm(props)
  const [account, setAccount] = useState<AccountDetails | null>(null)

  useEffect(() => {
    void auth.account.get().then(setAccount)
    // Once: the account is read when the screen opens, and after each change below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (account === null) return <Wrap f={f} as="div" slot="account" root={f.root} busy />
  const when = props.formatDate ?? ((iso: string) => new Date(iso).toLocaleString())
  const mfa = (mfaEnabled: boolean) => setAccount({ ...account, mfaEnabled })
  const part = (section: AccountSection): ReactNode => {
    switch (section) {
      case 'profile': return <ProfilePart props={props} account={account} onSaved={setAccount} />
      case 'email': return <EmailPart props={props} account={account} />
      case 'password': return account.hasPassword ? <PasswordPart props={props} /> : null
      case 'linked': return <LinkedPart props={props} />
      case 'secondStep': return <SecondStepPart props={props} account={account} onChanged={mfa} />
      case 'phone': return <PhonePart props={props} account={account} onChanged={mfa} />
      case 'passkeys': return <PasskeysPart props={props} account={account} accountUrl={accountUrl()} when={when} />
      case 'agents': return <AgentsPart props={props} when={when} />
      case 'sessions': return <SessionsPart props={props} when={when} />
    }
  }

  return (
    <Wrap f={f} as="div" slot="account" root={f.root}>
      {(props.sections ?? ACCOUNT_SECTIONS).map((section) => <Fragment key={section}>{part(section)}</Fragment>)}
    </Wrap>
  )
}

/** What each part of the account screen takes, shown on its own: `<Account />`'s props but `sections`. */
export type AccountPartProps = Omit<AccountProps, 'sections'>

// Each part of the account screen on its own, for an application that puts
// them on separate cards. Each reads the account it shows.

/** The person's name. */
export function AccountProfile(props: AccountPartProps) { return <Account {...props} sections={['profile']} /> }
/** Changing the address: a link goes to the new one. */
export function AccountEmail(props: AccountPartProps) { return <Account {...props} sections={['email']} /> }
/** Changing the password, for an account that has one. */
export function AccountPassword(props: AccountPartProps) { return <Account {...props} sections={['password']} /> }
/** The providers the account signs in with. */
export function AccountLinked(props: AccountPartProps) { return <Account {...props} sections={['linked']} /> }
/** The second step with an authenticator app, and the recovery codes. */
export function AccountSecondStep(props: AccountPartProps) { return <Account {...props} sections={['secondStep']} /> }
/** The phone codes go to, where the workspace sends them. */
export function AccountPhone(props: AccountPartProps) { return <Account {...props} sections={['phone']} /> }
/** The account's passkeys. */
export function AccountPasskeys(props: AccountPartProps) { return <Account {...props} sections={['passkeys']} /> }
/** The AI agents the person connected, when there is one. */
export function AccountAgents(props: AccountPartProps) { return <Account {...props} sections={['agents']} /> }
/** Where the person is signed in, and "sign out everywhere". */
export function AccountSessions(props: AccountPartProps) { return <Account {...props} sections={['sessions']} /> }

/** An action `<OrganizationMembers hide={...} />` never offers. */
export type OrganizationMembersAction = 'archive' | 'delete' | 'rename' | 'leave'

/**
 * What `<OrganizationMembers />` tells the application after each change it
 * saved, for the application's own toast or its own data to follow.
 */
export type OrganizationMembersEvent =
  | { kind: 'member.added'; organizationId: string; userId: string; email: string; role: string }
  | { kind: 'member.role_changed'; organizationId: string; userId: string; role: string; previousRole: string }
  | { kind: 'member.removed'; organizationId: string; userId: string }
  | { kind: 'member.left'; organizationId: string; userId: string }
  | { kind: 'member.invited_again'; organizationId: string; userId: string }
  | { kind: 'organization.renamed'; organizationId: string; name: string }
  | { kind: 'organization.archived'; organizationId: string }
  | { kind: 'organization.deleted'; organizationId: string }

export interface OrganizationMembersProps extends Omit<AuthFormProps, 'links' | 'returnTo' | 'onSuccess' | 'createAccounts'> {
  /** The organization, by the id Cauthy gave it. */
  organizationId: string
  /** The moment of a membership, as the application writes dates. Default: the browser's own way. */
  formatDate?: (iso: string) => string
  /**
   * The roles offered when adding a member or changing one's role: those for
   * which it answers true. A member already holding another role keeps it,
   * and it shows. Default: every role the person may give.
   */
  roles?: (role: string, choice: OrganizationRoleChoice) => boolean
  /** Actions never offered, whatever the person's role allows. */
  hide?: OrganizationMembersAction[]
  /** A role's name wherever one shows: a member's, the role choices, adding one. Default: the name the catalog gives it. */
  roleLabel?: (choice: OrganizationRoleChoice) => string
  /** Called after every change saved, with what changed. */
  onSaved?: (event: OrganizationMembersEvent) => void
}

/** The role Cauthy keeps in every catalog: only its holders give it, or change and remove those who hold it. */
const OWNER = 'owner'

/**
 * What the signed-in person may do to one member, by their own seat: the
 * buttons <OrganizationMembers /> shows. Cauthy refuses the rest anyway; this
 * only keeps from offering it.
 */
export function memberActions(seat: OrganizationSeat, m: OrganizationPerson): { changeRole: boolean; remove: boolean; inviteAgain: boolean } {
  // An owner is changed or removed by another owner alone.
  const reachable = m.role !== OWNER || seat.role === OWNER
  return {
    changeRole: seat.can.manageMembers && reachable,
    // Leaving is anybody's; removing somebody else is cauthy:members:remove.
    remove: m.you || (seat.can.removeMembers && reachable),
    inviteAgain: seat.can.manageMembers && m.invited,
  }
}

/**
 * The roles the person may give: the owner role only by an owner, and of
 * those, the ones the application's `only` lets through.
 */
export function rolesToGive(seat: OrganizationSeat, roles: OrganizationRoleChoice[], only?: (role: string, choice: OrganizationRoleChoice) => boolean): OrganizationRoleChoice[] {
  const mine = seat.role === OWNER ? roles : roles.filter((c) => c.role !== OWNER)
  return only ? mine.filter((c) => only(c.role, c)) : mine
}

/**
 * The people of one of the signed-in person's organizations, administered
 * from the application. What it offers follows the person's role in the
 * system's catalog: cauthy:members read lists the people; manage adds them by
 * address (one with no account is invited), changes their role and sends an
 * invitation again; remove removes them. Anybody may leave. Only an owner
 * gives the owner role or changes an owner. cauthy:organization update,
 * archive and delete rename the organization, archive it, delete it. Cauthy
 * checks each change with the person's own session; the application
 * authorizes nothing. Like the other forms, it carries no styles.
 */
export function OrganizationMembers(props: OrganizationMembersProps) {
  const auth = useAuth()
  // The mark styles.css draws is the screen's; each part below is unstyled inside it, as in <Account />.
  const { root } = useForm(props as AccountProps)
  const { f, done, setDone, run } = useSection(props as AccountProps)
  // A refusal about the address or the new name shows under its field; any
  // other — a role, the last owner, a power the person lacks — above the list.
  const problem = f.error && f.error.field !== 'email' && f.error.field !== 'name' ? f.error : null
  const [seat, setSeat] = useState<OrganizationSeat | null | undefined>(undefined)
  const [members, setMembers] = useState<OrganizationPerson[] | null>(null)
  const [roles, setRoles] = useState<OrganizationRoleChoice[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [asking, setAsking] = useState<string | null>(null) // the member a removal waits on, or 'archive' / 'delete'
  // The forms of what is already set open on their action: adding a member
  // (once somebody besides the person belongs) and renaming.
  const [adding, setAdding] = useState(false)
  const [renamingOpen, setRenamingOpen] = useState(false)
  // Said once the organization is archived or deleted: there is nothing left to show.
  const [gone, setGone] = useState<string | null>(null)
  const id = props.organizationId
  const when = props.formatDate ?? ((iso: string) => new Date(iso).toLocaleDateString())
  const hidden = (action: OrganizationMembersAction) => props.hide?.includes(action) === true
  const saved = (event: OrganizationMembersEvent) => props.onSaved?.(event)

  const load = async () => {
    const [list, people, choices] = await Promise.all([auth.organizations.list(), auth.organizations.members(id), auth.organizations.roles(id)])
    const mine = list.find((o) => o.id === id) ?? null
    setSeat(mine)
    if (mine) setName(mine.name)
    setMembers(people)
    setRoles(choices ?? [])
    const offered = mine ? rolesToGive(mine, choices ?? [], props.roles) : []
    if (offered.length > 0 && !offered.some((c) => c.role === role)) setRole(offered[0].role)
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (gone !== null) return <Wrap f={f} as="div" slot="account" root={root}><Say f={f} tone="success">{gone}</Say></Wrap>
  if (seat === undefined) return <Wrap f={f} as="div" slot="account" root={root} busy />
  if (seat === null) return <Wrap f={f} as="div" slot="account" root={root}><Note f={f}>{f.t.organizationMissing}</Note></Wrap>
  const manage = seat.can.manageMembers
  const giveable = rolesToGive(seat, roles, props.roles)
  const roleName = (c: OrganizationRoleChoice) => props.roleLabel?.(c) || c.name || c.role
  const label = (r: string) => {
    const c = roles.find((x) => x.role === r)
    return c ? roleName(c) : r
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.check(checkEmail(email))) return
    const r = await run(() => auth.organizations.add(id, { email, role, locale: props.locale }), 'add')
    if (!r.ok) return
    setEmail('')
    setAdding(false)
    setDone(f.t.memberAdded.replace('{email}', r.member.email))
    saved({ kind: 'member.added', organizationId: id, userId: r.member.userId, email: r.member.email, role: r.member.role || role })
    await load()
  }
  const change = async (m: OrganizationPerson, next: string) => {
    const r = await run(() => auth.organizations.setRole(id, m.userId, next), `role:${m.userId}`)
    if (!r.ok) return
    saved({ kind: 'member.role_changed', organizationId: id, userId: m.userId, role: next, previousRole: m.role })
    await load()
  }
  const remove = async (m: OrganizationPerson) => {
    setAsking(null)
    const r = await run(() => auth.organizations.remove(id, m.userId), `remove:${m.userId}`)
    if (!r.ok) return
    saved({ kind: m.you ? 'member.left' : 'member.removed', organizationId: id, userId: m.userId })
    // Leaving: the organization is no longer the person's to see.
    if (m.you) setSeat(null)
    else await load()
  }
  const inviteAgain = async (m: OrganizationPerson) => {
    const r = await run(() => auth.organizations.inviteAgain(id, m.userId, { locale: props.locale }), `invite:${m.userId}`)
    if (!r.ok) return
    setDone(f.t.memberInvitationSent)
    saved({ kind: 'member.invited_again', organizationId: id, userId: m.userId })
  }
  const rename = async (e: FormEvent) => {
    e.preventDefault()
    const r = await run(() => auth.organizations.rename(id, name), 'rename')
    if (!r.ok) return
    setSeat(r.organization)
    setName(r.organization.name)
    setRenamingOpen(false)
    setDone(f.t.organizationRenamed.replace('{name}', r.organization.name))
    saved({ kind: 'organization.renamed', organizationId: id, name: r.organization.name })
  }
  const close = async (how: 'archive' | 'delete') => {
    setAsking(null)
    const r = await run<{ ok: boolean }>(() => (how === 'archive' ? auth.organizations.archive(id) : auth.organizations.delete(id)), how)
    if (!r.ok) return
    setGone((how === 'archive' ? f.t.organizationArchived : f.t.organizationDeleted).replace('{org}', seat.name))
    saved({ kind: how === 'archive' ? 'organization.archived' : 'organization.deleted', organizationId: id })
  }
  // Before what cannot be undone: the application's own dialog when it gave
  // one, otherwise the question inline, where the button was.
  const ask = (key: string, title: string, question: string, yes: () => void) => {
    const { Confirm } = f.C
    if (!Confirm) return setAsking(key)
    void Confirm({ title, body: question, confirmLabel: title, cancelLabel: f.t.cancel, danger: true }).then((ok) => { if (ok) yes() })
  }
  const confirming = (text: string, label: string, yes: () => void) => (
    <span role="group" aria-label={label}>
      <span>{text}</span>{' '}
      <f.Button type="button" variant="danger" disabled={f.busy} className={f.cx('providerButton')} onClick={yes}>{f.t.yes}</f.Button>
      <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => setAsking(null)}>{f.t.cancel}</f.Button>
    </span>
  )
  const leaveQuestion = f.t.memberLeaveConfirm.replace('{org}', seat.name)
  const archiveQuestion = f.t.organizationArchiveConfirm.replace('{org}', seat.name)
  const deleteQuestion = f.t.organizationDeleteConfirm.replace('{org}', seat.name)
  const archiving = seat.can.archive && !hidden('archive')
  const deleting = seat.can.delete && !hidden('delete')
  const renaming = seat.can.update && !hidden('rename')
  // Nobody but the person yet: the form to add the first member shows as it is.
  const alone = members !== null && members.every((m) => m.you)
  const addOpen = adding || alone
  const open = (form: 'add' | 'rename') => {
    setDone(null)
    f.setError(null)
    if (form === 'add') setAdding(true)
    else setRenamingOpen(true)
  }
  const cancelAdd = () => {
    setEmail('')
    f.setError(null)
    setAdding(false)
  }
  const cancelRename = () => {
    setName(seat.name)
    f.setError(null)
    setRenamingOpen(false)
  }

  return (
    <Wrap f={f} as="div" slot="account" root={root}>
      <Wrap f={f} as="section" slot="section" section="members">
        <Heading f={f}>{f.t.members} · {seat.name}</Heading>
        {problem && <Say f={f} tone="danger">{f.say(problem)}</Say>}
        {members === null ? (
          <>
            <Note f={f}>{f.t.membersHidden}</Note>
            {/* Whoever cannot see the people may still leave. */}
            {auth.session && !hidden('leave') && (asking === auth.session.user.id
              ? confirming(leaveQuestion, f.t.memberLeave, () => void remove({ userId: auth.session!.user.id, you: true } as OrganizationPerson))
              : <f.Button type="button" variant="danger" loading={f.loading(`remove:${auth.session.user.id}`)} disabled={f.busy} className={f.cx('providerButton')}
                onClick={() => ask(auth.session!.user.id, f.t.memberLeave, leaveQuestion, () => void remove({ userId: auth.session!.user.id, you: true } as OrganizationPerson))}>{f.t.memberLeave}</f.Button>)}
          </>
        ) : (
          <ul className={f.cx('sessions')}>
            {members.map((m) => {
              const who = m.name || m.email
              const may = memberActions(seat, m)
              const removable = may.remove && !(m.you && hidden('leave'))
              const question = m.you ? leaveQuestion : f.t.memberRemoveConfirm.replace('{who}', who)
              const action = m.you ? f.t.memberLeave : f.t.memberRemove
              // The member's own role stays listed, even one the person may not give.
              const choices = giveable.some((c) => c.role === m.role) ? giveable : [...roles.filter((c) => c.role === m.role), ...giveable]
              return (
                <li key={m.userId} className={f.cx('session')}>
                  <span>
                    {who}{m.name ? ` · ${m.email}` : ''}
                    {m.you && <Tag f={f} plain={` (${f.t.memberYou})`}>{f.t.memberYou}</Tag>}
                    {f.C.Badge ? (
                      <>
                        {m.invited && <Tag f={f} tone="warning" plain="">{f.t.memberInvited}</Tag>}
                        {m.manager && <Tag f={f} tone="success" plain="">{f.t.memberManager}</Tag>}
                      </>
                    ) : `${m.invited ? ` · ${f.t.memberInvited}` : ''}${m.manager ? ` · ${f.t.memberManager}` : ''}`}
                    {' · '}{when(m.since)}
                  </span>{' '}
                  {may.changeRole && giveable.length > 0 ? (
                    <Pick f={f} name={`role_${m.userId}`} label={`${f.t.memberRole}: ${who}`} value={m.role} disabled={f.busy}
                      options={choices.map((c) => ({ value: c.role, label: roleName(c) }))} onChange={(next) => void change(m, next)} />
                  ) : f.C.Badge ? <f.C.Badge tone="neutral">{label(m.role)}</f.C.Badge> : <span>{label(m.role)}</span>}{' '}
                  {asking === m.userId ? (
                    confirming(question, action, () => void remove(m))
                  ) : (
                    <>
                      {may.inviteAgain && <f.Button type="button" variant="secondary" loading={f.loading(`invite:${m.userId}`)} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void inviteAgain(m)}>{f.t.memberInviteAgain}</f.Button>}
                      {removable && <f.Button type="button" variant="danger" loading={f.loading(`remove:${m.userId}`)} disabled={f.busy} className={f.cx('providerButton')} onClick={() => ask(m.userId, action, question, () => void remove(m))}>{action}</f.Button>}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {done && <Say f={f} tone="success">{done}</Say>}
      </Wrap>
      {manage && giveable.length > 0 && (addOpen ? (
        <Wrap f={f} as="form" slot="section" section="add-member" onSubmit={add} noValidate>
          <Heading f={f}>{f.t.memberAdd}</Heading>
          <Field f={f} name="email" type="email" label={f.t.email} value={email} autoComplete="off" required onChange={setEmail} />
          <AddRole f={f} value={role} options={giveable.map((c) => ({ value: c.role, label: roleName(c) }))} onChange={setRole} />
          <f.Button type="submit" variant="primary" loading={f.loading('add')} disabled={f.busy} className={f.cx('button')}>{f.t.memberAdd}</f.Button>
          {!alone && <Cancel f={f} onClick={cancelAdd} />}
        </Wrap>
      ) : (
        <Wrap f={f} as="div" slot="section" section="add-member">
          <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => open('add')}>{f.t.memberAdd}</f.Button>
        </Wrap>
      ))}
      {(renaming || archiving || deleting) && (
        <Wrap f={f} as="section" slot="section" section="organization">
          <Heading f={f}>{f.t.organization}</Heading>
          {renaming && (renamingOpen ? (
            <Wrap f={f} as="form" section="rename" onSubmit={rename} noValidate>
              <Field f={f} name="name" type="text" label={f.t.name} value={name} autoComplete="organization" required onChange={setName} />
              <f.Button type="submit" variant="primary" loading={f.loading('rename')} disabled={f.busy} className={f.cx('button')}>{f.t.organizationRename}</f.Button>
              <Cancel f={f} onClick={cancelRename} />
            </Wrap>
          ) : (
            <>
              <Note f={f}>{seat.name}</Note>
              <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => open('rename')}>{f.t.organizationRename}</f.Button>
            </>
          ))}
          {asking === 'archive' ? confirming(archiveQuestion, f.t.organizationArchive, () => void close('archive'))
            : asking === 'delete' ? confirming(deleteQuestion, f.t.organizationDelete, () => void close('delete'))
              : (
                <>
                  {archiving && <f.Button type="button" variant="danger" loading={f.loading('archive')} disabled={f.busy} className={f.cx('providerButton')} onClick={() => ask('archive', f.t.organizationArchive, archiveQuestion, () => void close('archive'))}>{f.t.organizationArchive}</f.Button>}
                  {deleting && <f.Button type="button" variant="danger" loading={f.loading('delete')} disabled={f.busy} className={f.cx('providerButton')} onClick={() => ask('delete', f.t.organizationDelete, deleteQuestion, () => void close('delete'))}>{f.t.organizationDelete}</f.Button>}
                </>
              )}
        </Wrap>
      )}
    </Wrap>
  )
}

/** The role a new member gets, labelled like the address above it. */
function AddRole({ f, value, options, onChange }: { f: Form; value: string; options: { value: string; label: string }[]; onChange: (role: string) => void }) {
  const id = useId()
  return (
    <Labelled f={f} id={id} label={f.t.memberRole}>
      <Pick f={f} id={id} name="role" value={value} options={options} onChange={onChange} />
    </Labelled>
  )
}

/**
 * The account's passkeys: made and removed on this page. A page that cannot
 * use the workspace's passkeys links to Cauthy's account page instead.
 */
function PasskeysPart({ props, account, accountUrl, when }: { props: AccountProps; account: AccountDetails; accountUrl: string; when: (iso: string) => string }) {
  const auth = useAuth()
  const { f, done, setDone, run, general } = useSection(props)
  const [here, setHere] = useState<boolean | null>(null)
  const [list, setList] = useState<Passkey[]>([])
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  // With a passkey already there, the form to add another opens on "Add a passkey".
  const [adding, setAdding] = useState(false)
  useEffect(() => {
    void auth.methods().then((m) => {
      const can = m.passkeyHere && canUsePasskeys()
      setHere(can)
      if (can) void auth.account.passkeys().then(setList)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (here === null) return null
  if (!here) {
    return (
      <Wrap f={f} as="section" slot="section" section="passkeys">
        <Heading f={f}>{f.t.passkeys}</Heading>
        <A f={f} href={accountUrl}>{f.t.managePasskeys}</A>
      </Wrap>
    )
  }
  const add = async (e: FormEvent | null, kind: 'device' | 'security_key' = 'device') => {
    e?.preventDefault()
    if (account.hasPassword && !f.check(checkPassword(password))) return
    const r = await run(() => auth.account.addPasskey({ name, password, kind }), kind === 'security_key' ? 'security_key' : SUBMIT)
    if (!r.ok) {
      // The person closed the browser's prompt: nothing to say.
      if (r.error.code === 'cancelled') f.setError(null)
      return
    }
    setList([...list, r.passkey])
    setName('')
    setPassword('')
    setAdding(false)
    setDone(f.t.passkeyAdded)
    props.onSaved?.({ kind: 'passkey.added', id: r.passkey.id })
  }
  const remove = async (id: string) => {
    const r = await run(() => auth.account.removePasskey(id), `remove:${id}`)
    if (!r.ok) return
    setList(list.filter((p) => p.id !== id))
    props.onSaved?.({ kind: 'passkey.removed', id })
  }
  const cancel = () => {
    setName('')
    setPassword('')
    f.setError(null)
    setAdding(false)
  }
  const listed = list.length === 0 ? <Note f={f}>{f.t.noPasskeys}</Note> : (
    <ul className={f.cx('sessions')}>
      {list.map((p) => (
        <li key={p.id} className={f.cx('session')}>
          {p.name || f.t.passkeyUnnamed}
          {p.kind !== 'unknown' && <Tag f={f} plain={` · ${f.t.passkeyKinds[p.kind]}`}>{f.t.passkeyKinds[p.kind]}</Tag>} · {when(p.createdAt)}{' '}
          <f.Button type="button" variant="danger" loading={f.loading(`remove:${p.id}`)} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void remove(p.id)}>{f.t.removePasskey}</f.Button>
        </li>
      ))}
    </ul>
  )
  // Passkeys already there: the list, and the action that opens the form.
  if (list.length > 0 && !adding) {
    return (
      <Wrap f={f} as="div" slot="section" section="passkeys">
        <Heading f={f}>{f.t.passkeys}</Heading>
        <Note f={f}>{f.t.passkeysHelp}</Note>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        {listed}
        <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => { setDone(null); f.setError(null); setAdding(true) }}>{f.t.addAnotherPasskey}</f.Button>
        {done && <Say f={f} tone="success">{done}</Say>}
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="section" section="passkeys" onSubmit={add} noValidate>
      <Heading f={f}>{f.t.passkeys}</Heading>
      <Note f={f}>{f.t.passkeysHelp}</Note>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      {listed}
      <Field f={f} name="name" type="text" label={f.t.passkeyName} value={name} autoComplete="off" onChange={setName} />
      {account.hasPassword && (
        <Field f={f} name="password" type="password" label={f.t.currentPassword} value={password} autoComplete="current-password" required onChange={setPassword} />
      )}
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.addPasskeyDevice}</f.Button>
      <f.Button type="button" variant="secondary" loading={f.loading('security_key')} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void add(null, 'security_key')}>{f.t.addSecurityKey}</f.Button>
      {list.length > 0 && <Cancel f={f} onClick={cancel} />}
      {done && <Say f={f} tone="success">{done}</Say>}
    </Wrap>
  )
}

/** Back from a part's form to what is set, with nothing sent. */
function Cancel({ f, onClick }: { f: Form; onClick: () => void }) {
  return <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={onClick}>{f.t.cancel}</f.Button>
}

/**
 * Recovery codes just made, with "Copy all" and "Download .txt". The codes go
 * to the clipboard or to a file the person saves: never to a log, and never
 * to the browser's storage.
 */
function RecoveryCodes({ f, codes }: { f: Form; codes: string[] }) {
  const [copied, setCopied] = useState<boolean | null>(null)
  useEffect(() => setCopied(null), [codes])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
    } catch {
      // No clipboard here, or the browser refused it: the codes stay on screen to select.
      setCopied(false)
    }
  }
  const download = () => {
    const file = new Blob([`${f.t.recoveryCodes}\n\n${codes.join('\n')}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recovery-codes.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Freed once the browser took the file.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return (
    <>
      <Note f={f}>{f.t.keepCodes}</Note>
      <ul className={f.cx('codes')}>{codes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
      <f.Button type="button" variant="secondary" className={f.cx('providerButton')} onClick={() => void copy()}>{f.t.copyCodes}</f.Button>
      <f.Button type="button" variant="secondary" className={f.cx('providerButton')} onClick={download}>{f.t.downloadCodes}</f.Button>
      {copied === true && <Say f={f} tone="success">{f.t.codesCopied}</Say>}
      {copied === false && <Say f={f} tone="danger">{f.t.codesNotCopied}</Say>}
    </>
  )
}

function ProfilePart({ props, account, onSaved }: { props: AccountProps; account: AccountDetails; onSaved: (a: AccountDetails) => void }) {
  const auth = useAuth()
  const { f, done, setDone, run, general } = useSection(props)
  const [name, setName] = useState(account.name)
  // A name already set shows as it is; its form opens with "Change".
  const [editing, setEditing] = useState(account.name.trim() === '')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const r = await run(() => auth.account.update({ name }))
    if (!r.ok) return
    onSaved(r.account)
    setName(r.account.name)
    setEditing(r.account.name.trim() === '')
    setDone(f.t.saved)
    props.onSaved?.({ kind: 'profile.saved', name: r.account.name })
  }
  const cancel = () => {
    setName(account.name)
    f.setError(null)
    setEditing(false)
  }
  if (!editing) {
    return (
      <Wrap f={f} as="div" slot="section" section="profile">
        <Heading f={f}>{f.t.profile}</Heading>
        <Note f={f}>{account.name}</Note>
        <Note f={f}>{account.email}</Note>
        <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => { setDone(null); setEditing(true) }}>{f.t.change}</f.Button>
        {done && <Say f={f} tone="success">{done}</Say>}
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="section" section="profile" onSubmit={submit} noValidate>
      <Heading f={f}>{f.t.profile}</Heading>
      <Note f={f}>{account.email}</Note>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <Field f={f} name="name" type="text" label={f.t.name} value={name} autoComplete="name" onChange={setName} />
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.save}</f.Button>
      {account.name.trim() !== '' && <Cancel f={f} onClick={cancel} />}
      {done && <Say f={f} tone="success">{done}</Say>}
    </Wrap>
  )
}

// The address is always set: it shows, and its form opens with "Change email".
function EmailPart({ props, account }: { props: AccountProps; account: AccountDetails }) {
  const auth = useAuth()
  const { f, done, setDone, run, general } = useSection(props)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [editing, setEditing] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.check(checkEmail(email), account.hasPassword && checkPassword(password))) return
    const r = await run(() => auth.account.changeEmail({ email, password }))
    if (!r.ok) return
    setEmail('')
    setPassword('')
    setEditing(false)
    setDone(f.t.emailSent.replace('{email}', r.email))
    props.onSaved?.({ kind: 'email.change_requested', email: r.email })
  }
  const cancel = () => {
    setEmail('')
    setPassword('')
    f.setError(null)
    setEditing(false)
  }
  if (!editing) {
    return (
      <Wrap f={f} as="div" slot="section" section="email">
        <Heading f={f}>{f.t.emailAddress}</Heading>
        <Note f={f}>{account.email}</Note>
        <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => { setDone(null); setEditing(true) }}>{f.t.changeEmail}</f.Button>
        {done && <Say f={f} tone="success">{done}</Say>}
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="section" section="email" onSubmit={submit} noValidate>
      <Heading f={f}>{f.t.emailAddress}</Heading>
      <Note f={f}>{account.email}</Note>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <Field f={f} name="email" type="email" label={f.t.newEmail} value={email} autoComplete="email" required onChange={setEmail} />
      {account.hasPassword && (
        <Field f={f} name="password" type="password" label={f.t.currentPassword} value={password} autoComplete="current-password" required onChange={setPassword} />
      )}
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.changeEmail}</f.Button>
      <Cancel f={f} onClick={cancel} />
    </Wrap>
  )
}

/** The providers the account signs in with, and the ones the workspace offers to link. */
function LinkedPart({ props }: { props: AccountProps }) {
  const auth = useAuth()
  const { f, run, general } = useSection(props)
  const [linked, setLinked] = useState<LinkedIdentity[] | null>(null)
  const [offered, setOffered] = useState<{ id: string; name: string }[]>([])
  const [came, setCame] = useState<string | null>(null)
  useEffect(() => {
    void auth.account.identities().then(setLinked)
    void auth.methods().then((m) => setOffered(m.providers))
    // Back from a provider: say how it went, once.
    const back = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search)
    const provider = back?.get('linked')
    if (provider) {
      setCame(provider)
      props.onSaved?.({ kind: 'identity.linked', provider })
    }
    else if (back?.get('auth_error')) f.setError({ code: back.get('auth_error') as string, message: 'That account could not be linked. Try again.' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (linked === null) return null
  const name = (id: string) => offered.find((p) => p.id === id)?.name ?? id
  const unlink = async (provider: string) => {
    const r = await run(() => auth.account.unlink(provider), `unlink:${provider}`)
    if (!r.ok) return
    setLinked(linked.filter((x) => x.provider !== provider))
    props.onSaved?.({ kind: 'identity.unlinked', provider })
  }
  const here = typeof window === 'undefined' ? undefined : window.location.pathname
  return (
    <Wrap f={f} as="section" slot="section" section="linked">
      <Heading f={f}>{f.t.linkedAccounts}</Heading>
      {came && <Say f={f} tone="success">{f.t.linked}</Say>}
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      {linked.length === 0 ? <Note f={f}>{f.t.noLinkedAccounts}</Note> : (
        <ul className={f.cx('sessions')}>
          {linked.map((x) => (
            <li key={x.provider} className={f.cx('session')}>
              {name(x.provider)}{x.email ? ` · ${x.email}` : ''}{' '}
              <f.Button type="button" variant="danger" loading={f.loading(`unlink:${x.provider}`)} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void unlink(x.provider)}>{f.t.unlink}</f.Button>
            </li>
          ))}
        </ul>
      )}
      {offered.filter((p) => !linked.some((x) => x.provider === p.id)).map((p) => (
        <f.Button key={p.id} type="button" variant="secondary" loading={f.loading(`link:${p.id}`)} disabled={f.busy} className={f.cx('providerButton')}
          onClick={() => { f.setBusy(`link:${p.id}`); auth.account.link(p.id, { returnTo: here }) }}>{f.t.linkWith} {p.name}</f.Button>
      ))}
    </Wrap>
  )
}

// Shown only for an account with a password: it says so, and its form opens with "Change password".
function PasswordPart({ props }: { props: AccountProps }) {
  const auth = useAuth()
  const { f, done, setDone, run, general } = useSection(props)
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [editing, setEditing] = useState(false)
  usePasswordPolicy(f, useMethods(auth))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.check(checkPassword(password), newPasswordProblem(newPassword, f.policy, 'newPassword'))) return
    const r = await run(() => auth.account.changePassword({ password, newPassword }))
    if (!r.ok) return
    setPassword('')
    setNewPassword('')
    setEditing(false)
    setDone(f.t.passwordChangedHere)
    props.onSaved?.({ kind: 'password.changed' })
  }
  const cancel = () => {
    setPassword('')
    setNewPassword('')
    f.setError(null)
    setEditing(false)
  }
  if (!editing) {
    return (
      <Wrap f={f} as="div" slot="section" section="password">
        <Heading f={f}>{f.t.password}</Heading>
        <Note f={f}>{f.t.passwordSet}</Note>
        <f.Button type="button" variant="secondary" disabled={f.busy} className={f.cx('providerButton')} onClick={() => { setDone(null); setEditing(true) }}>{f.t.changePassword}</f.Button>
        {done && <Say f={f} tone="success">{done}</Say>}
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="section" section="password" onSubmit={submit} noValidate>
      <Heading f={f}>{f.t.password}</Heading>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <Field f={f} name="password" type="password" label={f.t.currentPassword} value={password} autoComplete="current-password" required onChange={setPassword} />
      <Field f={f} name="newPassword" type="password" label={f.t.newPassword} value={newPassword} autoComplete="new-password" required onChange={setNewPassword} hint={f.passwordRule} />
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.changePassword}</f.Button>
      <Cancel f={f} onClick={cancel} />
    </Wrap>
  )
}

// Off: the steps that turn it on. On: what is on, with "Turn off" and "New
// recovery codes"; each asks for the current password only once pressed.
function SecondStepPart({ props, account, onChanged }: { props: AccountProps; account: AccountDetails; onChanged: (on: boolean) => void }) {
  const auth = useAuth()
  const { f, run, general } = useSection(props)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string; qr: string } | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  // The action pressed while the second step is on, waiting for the password.
  const [asking, setAsking] = useState<'off' | 'codes' | null>(null)

  const start = async (e: FormEvent) => {
    e.preventDefault()
    const r = await run(() => auth.account.mfa.setup({ password }))
    if (r.ok) setSetup({ secret: r.secret, otpauthUri: r.otpauthUri, qr: r.qr ?? '' })
  }
  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    const r = await run(() => auth.account.mfa.verify({ code }))
    if (!r.ok) return
    setSetup(null)
    setCode('')
    setPassword('')
    setCodes(r.recoveryCodes)
    onChanged(true)
    props.onSaved?.({ kind: 'mfa.enabled' })
  }
  const turnOff = async (key: string) => {
    const r = await run(() => auth.account.mfa.disable({ password }), key)
    if (!r.ok) return
    setPassword('')
    setAsking(null)
    setCodes(null)
    onChanged(false)
    props.onSaved?.({ kind: 'mfa.disabled' })
  }
  const renew = async (key: string) => {
    const r = await run(() => auth.account.mfa.recoveryCodes({ password }), key)
    if (!r.ok) return
    setPassword('')
    setAsking(null)
    setCodes(r.recoveryCodes)
    props.onSaved?.({ kind: 'recovery_codes.regenerated' })
  }
  // An account without a password has nothing to ask: the action runs at once.
  const press = (what: 'off' | 'codes') => {
    f.setError(null)
    if (!account.hasPassword) return void (what === 'off' ? turnOff(what) : renew(what))
    setPassword('')
    setCodes(null)
    setAsking(what)
  }
  const cancel = () => {
    setPassword('')
    f.setError(null)
    setAsking(null)
  }
  const passwordField = account.hasPassword && (
    <Field f={f} name="password" type="password" label={f.t.currentPassword} value={password} autoComplete="current-password" required onChange={setPassword} />
  )

  if (setup) {
    return (
      <Wrap f={f} as="form" slot="section" section="secondStep" onSubmit={confirm} noValidate>
        <Heading f={f}>{f.t.secondStep}</Heading>
        <Note f={f}>{f.t.addToApp}</Note>
        {setup.qr && <img className={f.cx('qr')} src={setup.qr} width={220} height={220} alt={f.t.qrAlt} />}
        <code className={f.cx('secret')}>{setup.secret}</code>
        <A f={f} href={setup.otpauthUri}>{f.t.openInApp}</A>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        <Field f={f} name="code" type="text" label={f.t.code} value={code} autoComplete="one-time-code" required onChange={setCode} />
        <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.verify}</f.Button>
      </Wrap>
    )
  }
  if (!account.mfaEnabled) {
    return (
      <Wrap f={f} as="form" slot="section" section="secondStep" onSubmit={start} noValidate>
        <Heading f={f}>{f.t.secondStep}</Heading>
        <Note f={f}>{f.t.secondStepOff}</Note>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        {passwordField}
        <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.turnOn}</f.Button>
      </Wrap>
    )
  }
  if (asking) {
    const submit = (e: FormEvent) => {
      e.preventDefault()
      void (asking === 'off' ? turnOff(SUBMIT) : renew(SUBMIT))
    }
    return (
      <Wrap f={f} as="form" slot="section" section="secondStep" onSubmit={submit} noValidate>
        <Heading f={f}>{f.t.secondStep}</Heading>
        <Note f={f}>{f.t.secondStepOn}</Note>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        {passwordField}
        <f.Button type="submit" variant={asking === 'off' ? 'danger' : 'primary'} loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{asking === 'off' ? f.t.turnOff : f.t.newRecoveryCodes}</f.Button>
        <Cancel f={f} onClick={cancel} />
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="div" slot="section" section="secondStep">
      <Heading f={f}>{f.t.secondStep}</Heading>
      <Note f={f}>{f.t.secondStepOn}</Note>
      {codes && <RecoveryCodes f={f} codes={codes} />}
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <f.Button type="button" variant="danger" loading={f.loading('off')} disabled={f.busy} className={f.cx('button')} onClick={() => press('off')}>{f.t.turnOff}</f.Button>
      <f.Button type="button" variant="secondary" loading={f.loading('codes')} disabled={f.busy} className={f.cx('providerButton')} onClick={() => press('codes')}>{f.t.newRecoveryCodes}</f.Button>
    </Wrap>
  )
}

// The phone as the second step, where the workspace sends codes to phones:
// added with the password, proven with the code it receives. Once there, it
// shows (masked, with its channel) and "Remove phone" asks for the password.
function PhonePart({ props, account, onChanged }: { props: AccountProps; account: AccountDetails; onChanged: (on: boolean) => void }) {
  const auth = useAuth()
  const { f, run, general } = useSection(props)
  const [ways, setWays] = useState<SecondStep | null>(null)
  const [number, setNumber] = useState('')
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [removing, setRemoving] = useState(false)
  const load = () => auth.account.mfa.factors().then((w) => {
    setWays(w)
    if (w && w.phoneChannels.length > 0 && !w.phoneChannels.includes(channel)) setChannel(w.phoneChannels[0] as 'sms' | 'whatsapp')
  })
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!ways || ways.phoneChannels.length === 0) return null

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const r = await run(() => auth.account.mfa.addPhone({ phone: number, channel, password }))
    if (r.ok) setSentTo(r.sentTo)
  }
  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    const r = await run(() => auth.account.mfa.verifyPhone({ code }))
    if (!r.ok) return
    setSentTo('')
    setCode('')
    setPassword('')
    setNumber('')
    if (r.recoveryCodes.length > 0) setCodes(r.recoveryCodes)
    onChanged(true)
    props.onSaved?.({ kind: 'phone.added', channel })
    await load()
  }
  const remove = async (key: string) => {
    const r = await run(() => auth.account.mfa.removePhone({ password }), key)
    if (!r.ok) return
    setPassword('')
    setRemoving(false)
    setCodes(null)
    await load()
    const left = await auth.account.mfa.factors()
    onChanged(Boolean(left?.totp))
    props.onSaved?.({ kind: 'phone.removed' })
  }
  // An account without a password has nothing to ask: the phone goes at once.
  const press = () => {
    f.setError(null)
    if (!account.hasPassword) return void remove('remove')
    setPassword('')
    setRemoving(true)
  }
  const cancel = () => {
    setPassword('')
    f.setError(null)
    setRemoving(false)
  }
  const passwordField = account.hasPassword && (
    <Field f={f} name="password" type="password" label={f.t.currentPassword} value={password} autoComplete="current-password" required onChange={setPassword} />
  )
  if (sentTo) {
    return (
      <Wrap f={f} as="form" slot="section" section="phone" onSubmit={confirm} noValidate>
        <Heading f={f}>{f.t.phone}</Heading>
        <Note f={f}>{f.t.codeSent.replace('{to}', sentTo)}</Note>
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        <Field f={f} name="code" type="text" label={f.t.code} value={code} autoComplete="one-time-code" required onChange={setCode} />
        <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.verify}</f.Button>
      </Wrap>
    )
  }
  if (ways.phone) {
    const by = ways.phone.channel === 'whatsapp' ? f.t.byWhatsapp : ways.phone.channel === 'sms' ? f.t.bySms : ''
    const on = (
      <Note f={f}>
        {f.t.phoneOn.replace('{to}', ways.phone.number)}
        {by && <Tag f={f} plain={` · ${by}`}>{by}</Tag>}
      </Note>
    )
    if (removing) {
      return (
        <Wrap f={f} as="form" slot="section" section="phone" onSubmit={(e) => { e.preventDefault(); void remove(SUBMIT) }} noValidate>
          <Heading f={f}>{f.t.phone}</Heading>
          {on}
          {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
          {passwordField}
          <f.Button type="submit" variant="danger" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.removePhone}</f.Button>
          <Cancel f={f} onClick={cancel} />
        </Wrap>
      )
    }
    return (
      <Wrap f={f} as="div" slot="section" section="phone">
        <Heading f={f}>{f.t.phone}</Heading>
        {on}
        {codes && <RecoveryCodes f={f} codes={codes} />}
        {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
        <f.Button type="button" variant="danger" loading={f.loading('remove')} disabled={f.busy} className={f.cx('button')} onClick={press}>{f.t.removePhone}</f.Button>
      </Wrap>
    )
  }
  return (
    <Wrap f={f} as="form" slot="section" section="phone" onSubmit={add} noValidate>
      <Heading f={f}>{f.t.phone}</Heading>
      <Note f={f}>{`${f.t.phoneOff} ${f.t.phoneHelp}`}</Note>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <Field f={f} name="phone" type="tel" label={f.t.phone} value={number} autoComplete="tel" required onChange={setNumber} />
      {ways.phoneChannels.length > 1 && f.C.Select && (
        <ChannelPick f={f} value={channel} channels={ways.phoneChannels as ('sms' | 'whatsapp')[]} onChange={setChannel} />
      )}
      {ways.phoneChannels.length > 1 && !f.C.Select && (
        <div className={f.cx('field')} role="radiogroup">
          {(ways.phoneChannels as ('sms' | 'whatsapp')[]).map((c) => (
            <label key={c} className={f.cx('label')}>
              <input type="radio" name="channel" value={c} checked={channel === c} disabled={f.busy} onChange={() => setChannel(c)} /> {c === 'whatsapp' ? f.t.byWhatsapp : f.t.bySms}
            </label>
          ))}
        </div>
      )}
      {passwordField}
      <f.Button type="submit" variant="primary" loading={f.loading()} disabled={f.busy} className={f.cx('button')}>{f.t.addPhone}</f.Button>
    </Wrap>
  )
}

/** The AI agents the person connected. Shown only when there is one. */
function AgentsPart({ props, when }: { props: AccountProps; when: (iso: string) => string }) {
  const auth = useAuth()
  const { f, run, general } = useSection(props)
  const [list, setList] = useState<ConnectedAgent[]>([])
  useEffect(() => {
    void auth.account.agents().then(setList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (list.length === 0) return null
  const disconnect = async (id: string) => {
    const r = await run(() => auth.account.disconnectAgent(id), `disconnect:${id}`)
    if (!r.ok) return
    setList(list.filter((a) => a.id !== id))
    props.onSaved?.({ kind: 'agent.disconnected', id })
  }
  return (
    <Wrap f={f} as="section" slot="section" section="agents">
      <Heading f={f}>{f.t.agents}</Heading>
      <Note f={f}>{f.t.agentsHelp}</Note>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <ul className={f.cx('sessions')}>
        {list.map((a) => (
          <li key={a.id} className={f.cx('session')}>
            {a.name || f.t.anAgent}{a.redirectHost ? ` (${a.redirectHost})` : ''} → {a.resource.name}
            {a.scopes.length > 0 ? ` · ${a.scopes.map((s) => s.description || s.name).join(', ')}` : ''} · {when(a.lastUsedAt)}{' '}
            <f.Button type="button" variant="danger" loading={f.loading(`disconnect:${a.id}`)} disabled={f.busy} className={f.cx('providerButton')} onClick={() => void disconnect(a.id)}>{f.t.disconnect}</f.Button>
          </li>
        ))}
      </ul>
    </Wrap>
  )
}

/** Where the person is signed in, and "sign out everywhere". */
function SessionsPart({ props, when }: { props: AccountProps; when: (iso: string) => string }) {
  const auth = useAuth()
  const { f, run, general } = useSection(props)
  const [sessions, setSessions] = useState<AccountSession[]>([])
  useEffect(() => {
    void auth.account.sessions().then(setSessions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const end = async () => {
    const r = await run(() => auth.account.signOutEverywhere(), SUBMIT, true)
    if (!r.ok) return
    props.onSaved?.({ kind: 'sessions.ended' })
    // Signed out: the button loads until the page is left, or the application's own way on settles.
    if (props.onSignedOut) f.hold(props.onSignedOut())
    else window.location.assign('/')
  }
  return (
    <Wrap f={f} as="section" slot="section" section="sessions">
      <Heading f={f}>{f.t.sessions}</Heading>
      <ul className={f.cx('sessions')}>
        {sessions.map((s, i) => (
          <li key={i} className={f.cx('session')}>{s.device || f.t.unknownDevice} · {s.ip} · {when(s.createdAt)}</li>
        ))}
      </ul>
      {general && <Say f={f} tone="danger">{f.say(general)}</Say>}
      <f.Button type="button" variant="danger" loading={f.loading()} disabled={f.busy} className={f.cx('button')} onClick={() => void end()}>{f.t.signOutEverywhere}</f.Button>
    </Wrap>
  )
}

/** The channel phone codes go by, with the application's select. */
function ChannelPick({ f, value, channels, onChange }: { f: Form; value: 'sms' | 'whatsapp'; channels: ('sms' | 'whatsapp')[]; onChange: (c: 'sms' | 'whatsapp') => void }) {
  const id = useId()
  return (
    <Labelled f={f} id={id} label={f.t.channel}>
      <Pick f={f} id={id} name="channel" value={value} options={channels.map((c) => ({ value: c, label: c === 'whatsapp' ? f.t.byWhatsapp : f.t.bySms }))}
        onChange={(c) => onChange(c as 'sms' | 'whatsapp')} />
    </Labelled>
  )
}
