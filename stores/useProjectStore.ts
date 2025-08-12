import { create } from 'zustand'

type UnitSystem = 'Metric' | 'Imperial'

type ProjectState = {
  projectName: string
  clientName?: string
  designerName?: string
  location?: string
  buildingType: 'PEB' | 'LGS'
  designCode?: string
  unitSystem: UnitSystem
  set: (patch: Partial<ProjectState>) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: 'Demo Project',
  buildingType: 'PEB',
  unitSystem: 'Metric',
  set: (patch) => set((s) => ({ ...s, ...patch })),
}))
