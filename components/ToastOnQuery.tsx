"use client"
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from './Toast'

export default function ToastOnQuery() {
  const params = useSearchParams()
  const { push } = useToast()
  useEffect(() => {
    const notice = params.get('notice')
    if (notice) {
      if (notice === 'analysis-local') push({ text: 'Analysis set to Local mode', tone: 'warn' })
      if (notice === 'analysis-queue') push({ text: 'Analysis set to Queue mode', tone: 'info' })
      if (notice === 'analysis-done-local') push({ text: 'Local analysis completed', tone: 'info' })
      if (notice === 'analysis-done') push({ text: 'Analysis completed', tone: 'info' })
  if (notice === 'optimize-done-local') push({ text: 'Local optimization completed', tone: 'info' })
  if (notice === 'optimize-done') push({ text: 'Optimization completed', tone: 'info' })
    }
  }, [params, push])
  return null
}
