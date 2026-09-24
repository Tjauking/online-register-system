import { BRAND } from '../lib/brand'

export function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5h7a4.5 4.5 0 0 1 0 9H10l5.5 5.5M6 5v14.5" />
      </svg>
    </span>
  )
}

export default function Logo({ hideText = false }) {
  return (
    <span className="logo">
      <LogoMark />
      {!hideText && <span className="sb-hide">{BRAND}</span>}
    </span>
  )
}
