// Who is signed in, as a button with their initials and a menu: their name
// and address, "Manage account", "Sign out". Nobody signed in: "Sign in".
//
//   <UserButton accountHref="/account" signInHref="/sign-in" />
//
// The menu follows the WAI-ARIA menu button pattern: Enter, Space or
// ArrowDown opens it on its first item; ArrowUp, ArrowDown, Home and End move;
// Escape closes it and gives the focus back to the button.

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useAuth, useSession, useThemeVariables } from './react'

export interface UserButtonTexts {
  signIn: string
  /** The button's accessible name; `{name}` is the person's. */
  menu: string
  manageAccount: string
  signOut: string
}

const TEXTS: Record<'en' | 'es', UserButtonTexts> = {
  en: { signIn: 'Sign in', menu: 'Account menu for {name}', manageAccount: 'Manage account', signOut: 'Sign out' },
  es: { signIn: 'Entrar', menu: 'Menú de la cuenta de {name}', manageAccount: 'Administrar la cuenta', signOut: 'Cerrar sesión' },
}

type Part = 'root' | 'trigger' | 'avatar' | 'menu' | 'identity' | 'item'

export interface UserButtonProps {
  /** The language of the built-in words. Default: `en`. */
  locale?: 'en' | 'es'
  texts?: Partial<UserButtonTexts>
  /** Where "Manage account" goes: the application's own account page. Default: Cauthy's hosted one. */
  accountHref?: string
  /** Where "Sign in" goes: the application's own sign-in page. Default: Cauthy's hosted one. */
  signInHref?: string
  /** Called once signed out, instead of going to `/`. */
  onSignOut?: () => void
  /** More entries for the menu, after "Manage account". Give each `role="menuitem"` and `tabIndex={-1}`. */
  children?: ReactNode
  /** No look at all: no `data-cauthy`, no class names but the ones given. */
  unstyled?: boolean
  classNames?: Partial<Record<Part, string>>
}

/** Two letters for a person: the first and last word of the name, else the address's first letter. */
export function initialsOf(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = (w: string) => Array.from(w)[0] ?? ''
  if (words.length >= 2) return (first(words[0]) + first(words[words.length - 1])).toUpperCase()
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase()
  return (first(email.trim()) || '?').toUpperCase()
}

export function UserButton(props: UserButtonProps) {
  const { session, status, signIn, signOut: hostedSignOut, accountUrl } = useSession()
  const auth = useAuth()
  const look = useThemeVariables()
  const t: UserButtonTexts = { ...TEXTS[props.locale ?? 'en'], ...props.texts }
  const cx = (part: Part) => props.classNames?.[part] ?? (props.unstyled ? undefined : `cauthy-user-${part}`)
  const root = props.unstyled ? {} : { 'data-cauthy': '', style: look }
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const menuId = useId()
  const trigger = useRef<HTMLButtonElement | null>(null)
  const menu = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const outside = (e: MouseEvent) => {
      const target = e.target as Node
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [open])

  if (status !== 'authenticated' || session === null) {
    const waiting = status === 'loading'
    return (
      <div className={cx('root')} {...root}>
        {props.signInHref && !waiting
          ? <a className={cx('trigger')} href={props.signInHref}>{t.signIn}</a>
          : <button type="button" className={cx('trigger')} disabled={waiting} aria-busy={waiting || undefined} onClick={() => signIn()}>{t.signIn}</button>}
      </div>
    )
  }

  const name = session.user.name || session.user.email
  const close = (focus: boolean) => {
    setOpen(false)
    if (focus) trigger.current?.focus()
  }
  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
  const onMenuKey = (e: KeyboardEvent) => {
    const list = items()
    const at = list.indexOf(document.activeElement as HTMLElement)
    const go = (i: number) => {
      e.preventDefault()
      list[(i + list.length) % list.length]?.focus()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'ArrowDown') go(at + 1)
    else if (e.key === 'ArrowUp') go(at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(list.length - 1)
    else if (e.key === 'Tab') close(false)
  }
  const signOut = async () => {
    setLeaving(true)
    const r = await auth.signOut()
    // A backend that serves only Cauthy's hosted pages has no own sign-out: its /logout does it.
    if (!r.ok && r.error.code === 'not_configured') return hostedSignOut()
    setLeaving(false)
    if (!r.ok) return
    setOpen(false)
    if (props.onSignOut) props.onSignOut()
    else window.location.assign('/')
  }

  return (
    <div className={cx('root')} {...root}>
      <button
        ref={trigger}
        type="button"
        className={cx('trigger')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t.menu.replace('{name}', name)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className={cx('avatar')} aria-hidden="true">{initialsOf(session.user.name, session.user.email)}</span>
      </button>
      {open && (
        <div ref={menu} id={menuId} role="menu" aria-label={name} className={cx('menu')} onKeyDown={onMenuKey}>
          <div className={cx('identity')} role="presentation">
            <strong>{session.user.name}</strong>
            <span>{session.user.email}</span>
          </div>
          <a role="menuitem" tabIndex={-1} className={cx('item')} href={props.accountHref ?? accountUrl()}>{t.manageAccount}</a>
          {props.children}
          <button role="menuitem" tabIndex={-1} type="button" className={cx('item')} disabled={leaving} aria-busy={leaving || undefined} onClick={() => void signOut()}>{t.signOut}</button>
        </div>
      )}
    </div>
  )
}
