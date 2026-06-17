export interface Vaccine {
  id: string
  name: string
  type: string
  manufacturer: string
  specification: string
  dosage: string
  storageCondition: string
  createTime: string
}

export interface VaccineBatch {
  id: string
  vaccineId: string
  vaccineName: string
  batchNo: string
  produceDate: string
  expireDate: string
  quantity: number
  unit: string
  inTransitQuantity?: number
  traceCodeStart: string
  traceCodeEnd: string
  status: 'normal' | 'nearExpire' | 'expired' | 'destroyed'
  createTime: string
}

export interface StockRecord {
  id: string
  type: 'in' | 'out'
  batchId: string
  vaccineName: string
  batchNo: string
  quantity: number
  unit: string
  operator: string
  operateTime: string
  remark: string
  source?: string
  target?: string
  acceptanceResult?: 'passed' | 'failed'
  acceptanceRemark?: string
}

export interface ColdStorage {
  id: string
  name: string
  location: string
  capacity: number
  currentTemp: number
  targetTempMin: number
  targetTempMax: number
  status: 'normal' | 'warning' | 'alarm'
  lastUpdate: string
}

export interface TemperatureRecord {
  id: string
  deviceId: string
  deviceType: 'storage' | 'vehicle'
  deviceName: string
  temperature: number
  humidity?: number
  recordTime: string
  status: 'normal' | 'warning' | 'alarm'
}

export interface TransportRecord {
  id: string
  vehicleNo: string
  driver: string
  startTime: string
  endTime?: string
  startLocation: string
  endLocation: string
  status: 'transporting' | 'completed' | 'abnormal'
  vaccines: {
    batchId: string
    vaccineName: string
    batchNo: string
    quantity: number
  }[]
  temperatureRecords: TemperatureRecord[]
  abnormalRemark?: string
  conclusion?: string
  temperatureOverLimit?: boolean
}

export interface AlarmRecord {
  id: string
  deviceId: string
  deviceName: string
  deviceType: string
  alarmType: 'overTemp' | 'underTemp' | 'powerOff' | 'deviceError'
  alarmLevel: 'warning' | 'critical'
  startTime: string
  endTime?: string
  status: 'pending' | 'processing' | 'resolved'
  handler?: string
  handleMethod?: string
  handleTime?: string
  temperature: number
}

export interface DistributionRecord {
  id: string
  batchId: string
  vaccineName: string
  batchNo: string
  quantity: number
  clinicId: string
  clinicName: string
  distributor: string
  distributeTime: string
  traceCodes: string[]
  receiveStatus: 'pending' | 'received'
  receiveTime?: string
  receiver?: string
}

export interface Clinic {
  id: string
  name: string
  address: string
  contact: string
  phone: string
  level: 'community' | 'district' | 'city'
}

export interface ChainBreakEvent {
  id: string
  eventType: 'temperature' | 'transport' | 'storage' | 'other'
  description: string
  location: string
  startTime: string
  endTime?: string
  affectedBatches: string[]
  status: 'investigating' | 'processing' | 'closed'
  handler: string
  result?: string
  batchAssessments?: {
    batchId: string
    result: 'continue' | 'retest' | 'destroy'
    suggestion: string
    assessTime: string
    assessor: string
  }[]
}

export interface VaccinationStats {
  id: string
  date: string
  vaccineName: string
  batchNo: string
  clinicName: string
  doses: number
  population: string
  coverageRate: number
}

export interface DestroyRecord {
  id: string
  batchId: string
  vaccineName: string
  batchNo: string
  quantity: number
  reason: string
  destroyMethod: string
  operator: string
  supervisor: string
  destroyTime: string
  remark: string
}

export interface TraceCodeRecord {
  id: string
  traceCode: string
  batchId: string
  vaccineName: string
  batchNo: string
  status: 'inStock' | 'distributed' | 'vaccinated' | 'destroyed'
  currentLocation: string
  scanHistory: {
    time: string
    location: string
    operator: string
    action: string
  }[]
}
