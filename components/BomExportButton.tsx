"use client"

type Item = { part: string; size: string; qty: number; length_m: number }

export default function BomExportButton({ items }: { items: Item[] }) {
  async function onClick() {
    try {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bom.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[BOM][EXPORT] failed', e)
      alert('Failed to export CSV')
    }
  }
  return (
    <button onClick={onClick} className="rounded-md bg-zinc-900 px-4 py-2 text-white">
      Download CSV
    </button>
  )
}
