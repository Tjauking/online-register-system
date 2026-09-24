import { useEffect, useState } from 'react'
import api from '../api/axios'

// Whether the server has an NVIDIA key configured; fetched once per page load
let statusPromise = null

export function useAiStatus() {
  const [status, setStatus] = useState({ enabled: false, model: null, loaded: false })
  useEffect(() => {
    statusPromise ??= api.get('/ai/status').then((r) => r.data).catch(() => ({ enabled: false, model: null }))
    let live = true
    statusPromise.then((s) => live && setStatus({ ...s, loaded: true }))
    return () => { live = false }
  }, [])
  return status
}

export const aiError = (err) => err.response?.data?.message || 'The AI assistant is unavailable right now'
