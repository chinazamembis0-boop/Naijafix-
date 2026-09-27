import { useMemo } from 'react'

export function Logo({ size = 'default', withText = false, className = '' }) {
  const logoSrc = '/images/ewizzy-logo.png'

  const styles = useMemo(() => {
    const base = {
      display: 'flex',
      alignItems: 'center',
      gap: size === 'small' ? 8 : size === 'large' ? 14 : 11,
    }
    const iconSize = size === 'small' ? 32 : size === 'large' ? 56 : 44
    return { base, iconSize }
  }, [size])

  return (
    <div className={`brand ${withText ? 'brand-lockup' : ''} ${className}`} style={styles.base}>
      <div
        className="brand-icon"
        style={{
          width: styles.iconSize,
          height: styles.iconSize,
          borderRadius: 12,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--nf-bg)',
        }}
      >
        <img
          src={logoSrc}
          alt="Ewizzy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            padding: size === 'small' ? 4 : size === 'large' ? 8 : 6,
            boxSizing: 'border-box',
          }}
        />
      </div>
      {withText && (
        <div className="brand-text">
          <span className="brand-name">Ewizzy</span>
          <span className="brand-tagline">Find. Book. Get It Done.</span>
        </div>
      )}
    </div>
  )
}

export function LogoIcon({ size = 44, className = '' }) {
  return (
    <img
      src="/images/ewizzy-logo.png"
      alt="Ewizzy"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: 10,
        display: 'block',
      }}
    />
  )
}