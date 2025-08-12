export type BuildingType = 'PEB' | 'LGS'

export interface BuildingDimensions {
  width: number
  length: number
  eaveHeight: number
  roofSlope: number
  bays: number
}

export interface ProjectInput {
  projectName: string
  clientName?: string
  designerName?: string
  location?: string
  buildingType: BuildingType
  designCode: string
  unitSystem: 'Metric' | 'Imperial'
  dimensions?: BuildingDimensions
}
