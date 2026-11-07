// The signed-in person's organizations: a list to pick one from, and the
// people of the one picked (<OrganizationMembers />), with what the person's
// role lets them do there. The application that keeps an "active
// organization" hears each pick through `onSelect`.
//
//   <Organizations system="acme-crm" onSelect={(o) => setActive(o.id)} />

import { useId, useState } from 'react'
import type { OrganizationSeat } from '@cauthyhq/js'
import { OrganizationMembers, type OrganizationMembersProps } from './components'
import { useOrganizations } from './organizations'
import { useThemeVariables } from './react'

const TEXTS = {
  en: { title: 'Your organizations', none: 'You do not belong to any organization yet.', loading: 'Loading your organizations…', failed: 'Your organizations could not be loaded.', retry: 'Try again' },
  es: { title: 'Tus organizaciones', none: 'Todavía no perteneces a ninguna organización.', loading: 'Cargando tus organizaciones…', failed: 'No se pudieron cargar tus organizaciones.', retry: 'Intentar de nuevo' },
}

type ListPart = 'organizations' | 'organizationList' | 'organization' | 'organizationRole' | 'retry'

export interface OrganizationsProps extends Omit<OrganizationMembersProps, 'organizationId'> {
  /** Only one system's organizations. */
  system?: string
  /** The one shown first. Default: the first of the list. */
  defaultOrganizationId?: string
  /** Called when the person picks one. */
  onSelect?: (organization: OrganizationSeat) => void
  /** Show the people of the one picked. Default: true. */
  showMembers?: boolean
  /** A class for each part of the list; the members part takes `classNames`. */
  listClassNames?: Partial<Record<ListPart, string>>
}

export function Organizations(props: OrganizationsProps) {
  const { system, defaultOrganizationId, onSelect, showMembers, listClassNames, ...members } = props
  const { organizations, loading, error, reload } = useOrganizations({ system })
  const [picked, setPicked] = useState<string | null>(defaultOrganizationId ?? null)
  const heading = useId()
  const look = useThemeVariables()
  const t = TEXTS[props.locale ?? 'en']
  const cx = (part: ListPart | 'heading' | 'notice' | 'error') =>
    listClassNames?.[part as ListPart] ?? (props.unstyled ? undefined : `cauthy-${part}`)
  const root = props.unstyled ? {} : { 'data-cauthy': '', style: look }
  const current = organizations.find((o) => o.id === picked) ?? organizations[0] ?? null

  if (loading && organizations.length === 0) {
    return <section className={cx('organizations')} {...root} aria-busy="true"><p className={cx('notice')} role="status">{t.loading}</p></section>
  }
  // A list that could not be had is not an empty one: say so, and offer to ask again.
  if (error && organizations.length === 0) {
    return (
      <section className={cx('organizations')} {...root} aria-busy={loading || undefined}>
        <p className={cx('error')} role="alert" aria-live="assertive" aria-atomic="true">{t.failed}</p>
        <button type="button" className={cx('retry')} disabled={loading} onClick={() => void reload()}>{t.retry}</button>
      </section>
    )
  }
  if (organizations.length === 0) {
    return <section className={cx('organizations')} {...root}><p className={cx('notice')}>{t.none}</p></section>
  }
  return (
    <section className={cx('organizations')} {...root} aria-labelledby={heading}>
      <h2 id={heading} className={cx('heading')}>{t.title}</h2>
      <ul className={cx('organizationList')}>
        {organizations.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              className={cx('organization')}
              aria-current={o.id === current?.id ? 'true' : undefined}
              onClick={() => {
                setPicked(o.id)
                onSelect?.(o)
              }}
            >
              <span>{o.name}</span>
              <span className={cx('organizationRole')}>{o.role}</span>
            </button>
          </li>
        ))}
      </ul>
      {showMembers !== false && current && <OrganizationMembers key={current.id} {...members} organizationId={current.id} />}
    </section>
  )
}
