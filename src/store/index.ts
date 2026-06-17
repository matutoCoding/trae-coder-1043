import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Vaccine, VaccineBatch, StockRecord, ColdStorage, TemperatureRecord,
  TransportRecord, AlarmRecord, DistributionRecord, Clinic,
  ChainBreakEvent, VaccinationStats, DestroyRecord, TraceCodeRecord
} from '@/types'
import {
  vaccines as mockVaccines, vaccineBatches as mockBatches, stockRecords as mockStockRecords,
  coldStorages as mockColdStorages, temperatureRecords as mockTempRecords,
  transportRecords as mockTransportRecords, alarmRecords as mockAlarmRecords,
  distributionRecords as mockDistributions, clinics as mockClinics,
  chainBreakEvents as mockChainBreakEvents, vaccinationStats as mockStats,
  destroyRecords as mockDestroyRecords, traceCodeRecords as mockTraceCodes
} from '@/mock/data'

interface AppState {
  vaccines: Vaccine[]
  vaccineBatches: VaccineBatch[]
  stockRecords: StockRecord[]
  coldStorages: ColdStorage[]
  temperatureRecords: TemperatureRecord[]
  transportRecords: TransportRecord[]
  alarmRecords: AlarmRecord[]
  distributionRecords: DistributionRecord[]
  clinics: Clinic[]
  chainBreakEvents: ChainBreakEvent[]
  vaccinationStats: VaccinationStats[]
  destroyRecords: DestroyRecord[]
  traceCodeRecords: TraceCodeRecord[]
  
  addVaccine: (vaccine: Vaccine) => void
  addVaccineBatch: (batch: VaccineBatch) => void
  addStockRecord: (record: StockRecord) => void
  addTemperatureRecord: (record: TemperatureRecord) => void
  addTransportRecord: (record: TransportRecord) => void
  addAlarmRecord: (record: AlarmRecord) => void
  updateAlarmRecord: (id: string, updates: Partial<AlarmRecord>) => void
  addDistributionRecord: (record: DistributionRecord) => void
  addChainBreakEvent: (event: ChainBreakEvent) => void
  updateChainBreakEvent: (id: string, updates: Partial<ChainBreakEvent>) => void
  addVaccinationStats: (stats: VaccinationStats) => void
  addDestroyRecord: (record: DestroyRecord) => void
  updateVaccineBatch: (id: string, updates: Partial<VaccineBatch>) => void
  addTraceCodeRecord: (record: TraceCodeRecord) => void
  updateTraceCodeRecord: (traceCode: string, updates: Partial<TraceCodeRecord>) => void
  updateColdStorage: (id: string, updates: Partial<ColdStorage>) => void
  updateTransportRecord: (id: string, updates: Partial<TransportRecord>) => void
  updateDistributionRecord: (id: string, updates: Partial<DistributionRecord>) => void
  resetData: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase()

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      vaccines: mockVaccines,
      vaccineBatches: mockBatches,
      stockRecords: mockStockRecords,
      coldStorages: mockColdStorages,
      temperatureRecords: mockTempRecords,
      transportRecords: mockTransportRecords,
      alarmRecords: mockAlarmRecords,
      distributionRecords: mockDistributions,
      clinics: mockClinics,
      chainBreakEvents: mockChainBreakEvents,
      vaccinationStats: mockStats,
      destroyRecords: mockDestroyRecords,
      traceCodeRecords: mockTraceCodes,

      addVaccine: (vaccine) => set((state) => ({ vaccines: [...state.vaccines, { ...vaccine, id: generateId() }] })),
      addVaccineBatch: (batch) => set((state) => ({ vaccineBatches: [...state.vaccineBatches, { ...batch, id: generateId() }] })),
      addStockRecord: (record) => set((state) => ({ stockRecords: [...state.stockRecords, { ...record, id: generateId() }] })),
      addTemperatureRecord: (record) => set((state) => ({ temperatureRecords: [...state.temperatureRecords, { ...record, id: generateId() }] })),
      addTransportRecord: (record) => set((state) => ({ transportRecords: [...state.transportRecords, { ...record, id: generateId() }] })),
      addAlarmRecord: (record) => set((state) => ({ alarmRecords: [...state.alarmRecords, { ...record, id: generateId() }] })),
      updateAlarmRecord: (id, updates) => set((state) => ({
        alarmRecords: state.alarmRecords.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      addDistributionRecord: (record) => set((state) => ({ distributionRecords: [...state.distributionRecords, { ...record, id: generateId() }] })),
      addChainBreakEvent: (event) => set((state) => ({ chainBreakEvents: [...state.chainBreakEvents, { ...event, id: generateId() }] })),
      updateChainBreakEvent: (id, updates) => set((state) => ({
        chainBreakEvents: state.chainBreakEvents.map(e => e.id === id ? { ...e, ...updates } : e)
      })),
      addVaccinationStats: (stats) => set((state) => ({ vaccinationStats: [...state.vaccinationStats, { ...stats, id: generateId() }] })),
      addDestroyRecord: (record) => set((state) => ({ destroyRecords: [...state.destroyRecords, { ...record, id: generateId() }] })),
      updateVaccineBatch: (id, updates) => set((state) => ({
        vaccineBatches: state.vaccineBatches.map(b => b.id === id ? { ...b, ...updates } : b)
      })),
      addTraceCodeRecord: (record) => set((state) => ({ traceCodeRecords: [...state.traceCodeRecords, { ...record, id: generateId() }] })),
      updateTraceCodeRecord: (traceCode, updates) => set((state) => ({
        traceCodeRecords: state.traceCodeRecords.map(t => t.traceCode === traceCode ? { ...t, ...updates } : t)
      })),
      updateColdStorage: (id, updates) => set((state) => ({
        coldStorages: state.coldStorages.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      updateTransportRecord: (id, updates) => set((state) => ({
        transportRecords: state.transportRecords.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      updateDistributionRecord: (id, updates) => set((state) => ({
        distributionRecords: state.distributionRecords.map(d => d.id === id ? { ...d, ...updates } : d)
      })),
      resetData: () => set({
        vaccines: mockVaccines,
        vaccineBatches: mockBatches,
        stockRecords: mockStockRecords,
        coldStorages: mockColdStorages,
        temperatureRecords: mockTempRecords,
        transportRecords: mockTransportRecords,
        alarmRecords: mockAlarmRecords,
        distributionRecords: mockDistributions,
        clinics: mockClinics,
        chainBreakEvents: mockChainBreakEvents,
        vaccinationStats: mockStats,
        destroyRecords: mockDestroyRecords,
        traceCodeRecords: mockTraceCodes
      })
    }),
    {
      name: 'vaccine-monitor-storage'
    }
  )
)
