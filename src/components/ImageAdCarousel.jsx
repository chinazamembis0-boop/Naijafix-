import { useState, useEffect } from 'react'

const ADS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  src: `/images/ads/ewizzy-ad-${String(i + 1).padStart(2, '0')}.jpg`,
  alt: `Ewizzy promotion ${i + 1}`,
}))

export default function ImageAdCarousel() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % ADS.length), 4000)
    return () => clearInterval(t)
  }, [])
  const prev = () => setIndex((i) => (i - 1 + ADS.length) % ADS.length)
  const next = () => setIndex((i) => (i + 1) % ADS.length)
  return (
    <div className="nf-image-ad-carousel">
      <div className="nf-image-ad-viewport">
        <img src={ADS[index].src} alt={ADS[index].alt} />
      </div>
      <button className="nf-image-ad-prev" onClick={prev} aria-label="Previous">‹</button>
      <button className="nf-image-ad-next" onClick={next} aria-label="Next">›</button>
      <div className="nf-image-ad-dots">
        {ADS.map((a, i) => (
          <button key={a.id} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`} />
        ))}
      </div>
    </div>
  )
}
