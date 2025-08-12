"use client"

export default function ConnectionCalc({ data }: { data: any }) {
  const joints = Array.isArray(data?.joints) ? data.joints : []
  return (
    <div className="rounded border bg-white p-3 text-sm">
      {joints.length === 0 ? (
        <div className="text-zinc-600">No connection designs yet.</div>
      ) : (
        <div className="space-y-3">
          {joints.map((j: any, idx: number) => (
            <div key={idx} className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-xs text-zinc-500">Type</div>
                <div className="font-medium">{j.type}</div>
                <div className="mt-2 text-xs text-zinc-500">Bolts</div>
                <div>{j.design?.bolts?.count} × {j.design?.bolts?.diameter} ({j.design?.bolts?.grade})</div>
                <div className="mt-2 text-xs text-zinc-500">Plate</div>
                <div>{j.design?.plate?.size} · t={j.design?.plate?.thickness}</div>
                <div className="mt-2 text-xs text-zinc-500">Weld</div>
                <div>{j.design?.weld?.size} · {j.design?.weld?.length}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Checks</div>
                <ul className="list-disc pl-5">
                  {(j.design?.checks || []).map((c: any, i: number) => (
                    <li key={i}>{c.clause || c.type}: UC {(c.utilization ?? "").toFixed ? c.utilization.toFixed(2) : c.utilization}</li>
                  ))}
                </ul>
                <div className="mt-3 text-xs text-zinc-500">Input forces</div>
                <pre className="rounded bg-zinc-50 p-2 text-[11px] overflow-auto">{JSON.stringify(j.design?.input, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
