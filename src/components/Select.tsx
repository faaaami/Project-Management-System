import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption { value: string; label: string; description?: string; color?: string }

export function Select({ value, options, onChange, label, id, disabled = false }: { value: string; options: SelectOption[]; onChange: (value: string) => void; label: string; id?: string; disabled?: boolean }) {
  const generatedId = useId()
  const listId = `${generatedId}-options`
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [portalHost, setPortalHost] = useState<Element | null>(null)
  const [index, setIndex] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 })
  const selected = options.find(option => option.value === value)
  const choose = (next: number) => {
    if (options[next]) onChange(options[next].value)
    setOpen(false)
    trigger.current?.focus()
  }
  const show = () => { setPortalHost(trigger.current?.closest('dialog') ?? document.body); setIndex(Math.max(0, options.findIndex(option => option.value === value))); setOpen(true) }
  useEffect(() => {
    if (!open) return
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - 12
      const above = rect.top - 12
      const height = Math.min(280, Math.max(below, above))
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24)
      setPosition({ top: below >= Math.min(280, above) ? rect.bottom + 6 : Math.max(12, rect.top - height - 6), left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width, maxHeight: height })
    }
    place()
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false) }
    const scroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', scroll, true)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', scroll, true) }
  }, [open])
  useEffect(() => { if (open) popup.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' }) }, [index, open])
  const menu = <div ref={popup} id={listId} className="select-menu" role="listbox" aria-label={label} style={{ position: 'fixed', ...position }}>
    <p className="select-menu-label">{label}</p>
    {options.map((option, i) => <div key={option.value} id={`${listId}-${i}`} data-index={i} role="option" aria-selected={option.value === value} className={`select-option ${i === index ? 'highlighted' : ''} ${option.value === value ? 'selected' : ''}`} onPointerMove={() => setIndex(i)} onPointerDown={event => event.preventDefault()} onClick={() => choose(i)}>
      {option.color && <span className="option-dot" style={{ background: option.color }} />}<span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span><span className="option-check">{option.value === value ? '✓' : ''}</span>
    </div>)}
  </div>
  return <div className="custom-select"><button ref={trigger} id={id ?? generatedId} type="button" disabled={disabled} className="select-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" aria-activedescendant={open ? `${listId}-${index}` : undefined} onClick={() => open ? setOpen(false) : show()} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false) }
    else if (event.key === 'Tab') setOpen(false)
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); if (!open) show(); else setIndex(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length) }
    else if ((event.key === 'Enter' || event.key === ' ') && open) { event.preventDefault(); choose(index) }
    else if (open && event.key.length === 1) { const match = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase())); if (match >= 0) setIndex(match) }
  }}><span className="select-value">{selected?.color && <span className="option-dot" style={{ background: selected.color }} />}{selected?.label ?? 'Choose an option'}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>{open && portalHost && createPortal(menu, portalHost)}</div>
}
