"use client"

export default function FoundationCalc({ data }: { data: any }) {
  const d = data || {}
  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-zinc-500">Footing</div>
          <div className="font-medium">{d.footingSize || '—'}</div>
          <div className="mt-2 text-xs text-zinc-500">Soil bearing (qAllow)</div>
          <div>{d.qAllow ?? '—'} kPa</div>
          <div className="mt-2 text-xs text-zinc-500">Reinforcement</div>
          <div>{d.design?.reinforcement?.bottom} bottom</div>
          <div>{d.design?.reinforcement?.top} top</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Checks</div>
          <ul className="list-disc pl-5">
            {(d.design?.checks || []).map((c: any, i: number) => (
              <li key={i}>{c.type}: UC {(c.utilization ?? "").toFixed ? c.utilization.toFixed(2) : c.utilization}</li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-zinc-500">Input</div>
          <pre className="rounded bg-zinc-50 p-2 text-[11px] overflow-auto">{JSON.stringify(d.design?.input, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
