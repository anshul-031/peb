"use client"
import { useState } from 'react'
import { ProjectInput } from '@/types/project'

export default function ProjectForm() {
  const [form, setForm] = useState<ProjectInput>({
    projectName: '',
    buildingType: 'PEB',
    designCode: 'AISC 360-16',
    unitSystem: 'Metric',
  })

  return (
    <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col">
        <span className="text-sm text-zinc-600">Project Name</span>
        <input className="mt-1 rounded border px-3 py-2" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
      </label>
      <label className="flex flex-col">
        <span className="text-sm text-zinc-600">Design Code</span>
        <select className="mt-1 rounded border px-3 py-2" value={form.designCode} onChange={(e) => setForm({ ...form, designCode: e.target.value })}>
          <option>AISC 360-16</option>
          <option>MBMA 2018</option>
          <option>ASCE 7-16</option>
          <option>IS 800:2007</option>
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-sm text-zinc-600">Unit System</span>
        <select className="mt-1 rounded border px-3 py-2" value={form.unitSystem} onChange={(e) => setForm({ ...form, unitSystem: e.target.value as any })}>
          <option>Metric</option>
          <option>Imperial</option>
        </select>
      </label>
    </form>
  )
}
