import { useEffect, useId, useRef, useState } from 'react'
import { useDeveloperAccess } from '../auth/developerContext'
import { DeveloperNavigation } from './DeveloperNavigation'
import './developer-header-menu.css'

export function DeveloperHeaderMenu() {
  const { access } = useDeveloperAccess()
  const [expanded, setExpanded] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const open = Boolean(access?.canViewDashboard && expanded)

  useEffect(() => {
    if (!open) return
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setExpanded(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setExpanded(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!access?.canViewDashboard) return null

  return (
    <div className="developer-header-menu" ref={container} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false)
    }}>
      <button ref={trigger} type="button" aria-label="개발자 메뉴" aria-expanded={open} aria-controls={menuId}
        onClick={() => setExpanded(!open)}>
        <span className="developer-header-menu-icon" aria-hidden="true"><i /><i /><i /></span>
        <span className="hidden xl:inline">개발자 메뉴</span>
      </button>
      <div className="developer-header-menu-panel" id={menuId} hidden={!open}>
        <DeveloperNavigation />
      </div>
    </div>
  )
}
