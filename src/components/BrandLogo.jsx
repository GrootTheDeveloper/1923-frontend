export default function BrandLogo({ subtitle, compact = false }) {
  return (
    <>
      <span className="brand-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" role="img">
          <rect x="5" y="5" width="30" height="30" rx="9" fill="currentColor" />
          <path d="M14 14.5h9.2a4.9 4.9 0 0 1 0 9.8H19" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M14 20h12" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="m20 25.5 3.1 3.1 6.9-7.2" stroke="#f4c46a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="brand-logo-copy">
        <strong>TalentScan</strong>
        {!compact && subtitle ? <small>{subtitle}</small> : null}
      </div>
    </>
  );
}