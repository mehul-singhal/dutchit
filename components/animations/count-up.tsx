'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  to: number
  duration?: number
  decimals?: number
}

export function CountUp({ to, duration = 1000, decimals = 0 }: Props) {
  const [current, setCurrent] = useState(0)
  const startRef = useRef<number | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (to === 0) {
      setCurrent(0)
      return
    }

    startRef.current = null

    function animate(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(eased * to)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [to, duration])

  return <>{decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString('en-IN')}</>
}
