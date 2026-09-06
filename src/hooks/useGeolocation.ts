'use client'

import { useState, useEffect, useRef } from 'react'
import { Coords } from '@/types'

function haversineMeters(a: Coords, b: Coords): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

const MOVE_THRESHOLD_METERS = 100

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && !navigator.geolocation) {
      return 'Geolocation is not supported by your browser.'
    }
    return null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && !navigator.geolocation) {
      return false
    }
    return true
  })
  const lastCoords = useRef<Coords | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next: Coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        if (
          !lastCoords.current ||
          haversineMeters(lastCoords.current, next) >= MOVE_THRESHOLD_METERS
        ) {
          lastCoords.current = next
          setCoords(next)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { coords, error, loading }
}
