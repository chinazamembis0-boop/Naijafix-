import { useMemo } from 'react'

export function Logo({ size = 'default', showTagline = true, className = '' }) {
  const logoSrc = '/images/ewizzy-logo.png'

  const styles = useMemo(() => {
    const base = {
      display: 'flex',
      alignItems: 'center',
      gap: size === 'small' ? 8 : size === 'large' ? 14 : 11,
    }
    const iconSize = size === 'small' ? 32 : size === 'large' ? 56 : 44
    const fontSize = size === 'small' ? 16 : size === 'large' ? 28 : 21
    const taglineSize = size === 'small' ? 10 : size === 'large' ? 13 : 11
    return { base, iconSize, fontSize, taglineSize }
  }, [size])

  return (
    <div className={`brand ${className}`} style={styles.base}>
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
          alt="EWIZZY"
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
      <div>
        <h1 style={{ margin: 0, fontSize: styles.fontSize, fontFamily: 'var(--font-serif)', fontWeight: 800 }}>
          EWIZZY
        </h1>
        {showTagline && (
          <span style={{ color: 'var(--nf-text-muted)', fontSize: styles.taglineSize, letterSpacing: '0.3px' }}>
            Find. Book. Get It Done.
          </span>
        )}
      </div>
    </div>
  )
}

export function LogoIcon({ size = 44, className = '' }) {
  return (
    <img
      src="/images/ewizzy-logo.png"
      alt="EWIZZY"
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