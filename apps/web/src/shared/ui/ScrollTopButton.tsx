import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import styles from './ScrollTopButton.module.css'

export function ScrollTopButton() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null
  return (
    <button
      className={styles.btn}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="맨 위로"
    >
      <ArrowUp size={18} strokeWidth={2.4} />
    </button>
  )
}
