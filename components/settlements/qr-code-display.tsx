'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  upiString: string
  size?: number
}

export function QrCodeDisplay({ upiString, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !upiString) return
    QRCode.toCanvas(canvasRef.current, upiString, {
      width: size,
      margin: 1,
      color: {
        dark: '#0a0f1e',
        light: '#00d4aa',
      },
    }).catch(() => setError(true))
  }, [upiString, size])

  if (error) {
    return (
      <div className="glass rounded-xl p-4 text-center text-xs text-muted-foreground">
        Could not generate QR. Use the app buttons above.
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="glass rounded-2xl p-4 inline-block">
        <canvas ref={canvasRef} className="rounded-xl" />
        <p className="text-xs text-center text-muted-foreground mt-2">
          Scan with any UPI app
        </p>
      </div>
    </div>
  )
}
