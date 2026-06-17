import type {
  Vaccine, VaccineBatch, StockRecord, ColdStorage, TemperatureRecord,
  TransportRecord, AlarmRecord, DistributionRecord, Clinic,
  ChainBreakEvent, VaccinationStats, DestroyRecord, TraceCodeRecord
} from '@/types'
import dayjs from 'dayjs'

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase()

export const vaccines: Vaccine[] = [
  { id: 'V001', name: '新冠灭活疫苗', type: '灭活疫苗', manufacturer: '国药中生', specification: '0.5ml/支', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
  { id: 'V002', name: '乙肝疫苗', type: '重组疫苗', manufacturer: '葛兰素史克', specification: '10μg/0.5ml', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
  { id: 'V003', name: '麻疹风疹联合疫苗', type: '减毒活疫苗', manufacturer: '上海生物', specification: '0.5ml/支', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
  { id: 'V004', name: '脊髓灰质炎灭活疫苗', type: '灭活疫苗', manufacturer: '赛诺菲', specification: '0.5ml/支', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
  { id: 'V005', name: '百白破联合疫苗', type: '灭活疫苗', manufacturer: '武汉生物', specification: '0.5ml/支', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
  { id: 'V006', name: '流感疫苗', type: '灭活疫苗', manufacturer: '华兰生物', specification: '0.5ml/支', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
  { id: 'V007', name: '肺炎球菌疫苗', type: '多糖疫苗', manufacturer: '辉瑞', specification: '0.5ml/支', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
  { id: 'V008', name: '水痘减毒活疫苗', type: '减毒活疫苗', manufacturer: '长春百克', specification: '0.5ml/支', dosage: '0.5ml', storageCondition: '2-8℃冷藏', createTime: '2026-01-01' },
]

export const vaccineBatches: VaccineBatch[] = [
  { id: 'B001', vaccineId: 'V001', vaccineName: '新冠灭活疫苗', batchNo: '202601001', produceDate: '2026-01-15', expireDate: '2027-01-14', quantity: 5000, unit: '支', traceCodeStart: 'CN2026010010001', traceCodeEnd: 'CN2026010015000', status: 'normal', createTime: '2026-01-20' },
  { id: 'B002', vaccineId: 'V001', vaccineName: '新冠灭活疫苗', batchNo: '202602002', produceDate: '2026-02-10', expireDate: '2027-02-09', quantity: 8000, unit: '支', traceCodeStart: 'CN2026020020001', traceCodeEnd: 'CN2026020028000', status: 'normal', createTime: '2026-02-15' },
  { id: 'B003', vaccineId: 'V002', vaccineName: '乙肝疫苗', batchNo: '202512003', produceDate: '2025-12-20', expireDate: '2026-12-19', quantity: 3000, unit: '支', traceCodeStart: 'CN2025120030001', traceCodeEnd: 'CN2025120033000', status: 'nearExpire', createTime: '2025-12-25' },
  { id: 'B004', vaccineId: 'V003', vaccineName: '麻疹风疹联合疫苗', batchNo: '202603004', produceDate: '2026-03-05', expireDate: '2027-03-04', quantity: 2000, unit: '支', traceCodeStart: 'CN2026030040001', traceCodeEnd: 'CN2026030042000', status: 'normal', createTime: '2026-03-10' },
  { id: 'B005', vaccineId: 'V004', vaccineName: '脊髓灰质炎灭活疫苗', batchNo: '202506005', produceDate: '2025-06-10', expireDate: '2026-06-09', quantity: 1500, unit: '支', traceCodeStart: 'CN2025060050001', traceCodeEnd: 'CN2025060051500', status: 'expired', createTime: '2025-06-15' },
  { id: 'B006', vaccineId: 'V005', vaccineName: '百白破联合疫苗', batchNo: '202604006', produceDate: '2026-04-01', expireDate: '2027-03-31', quantity: 4500, unit: '支', traceCodeStart: 'CN2026040060001', traceCodeEnd: 'CN2026040064500', status: 'normal', createTime: '2026-04-05' },
  { id: 'B007', vaccineId: 'V006', vaccineName: '流感疫苗', batchNo: '202605007', produceDate: '2026-05-15', expireDate: '2027-05-14', quantity: 6000, unit: '支', traceCodeStart: 'CN2026050070001', traceCodeEnd: 'CN2026050076000', status: 'normal', createTime: '2026-05-20' },
  { id: 'B008', vaccineId: 'V007', vaccineName: '肺炎球菌疫苗', batchNo: '202508008', produceDate: '2025-08-20', expireDate: '2026-08-19', quantity: 1000, unit: '支', traceCodeStart: 'CN2025080080001', traceCodeEnd: 'CN2025080081000', status: 'nearExpire', createTime: '2025-08-25' },
]

export const stockRecords: StockRecord[] = [
  { id: 'S001', type: 'in', batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001', quantity: 5000, unit: '支', operator: '张医生', operateTime: '2026-01-20 10:30:00', remark: '采购入库', source: '国药中生', acceptanceResult: 'passed', acceptanceRemark: '外观完好，冷链正常' },
  { id: 'S002', type: 'in', batchId: 'B002', vaccineName: '新冠灭活疫苗', batchNo: '202602002', quantity: 8000, unit: '支', operator: '李医生', operateTime: '2026-02-15 14:20:00', remark: '采购入库', source: '国药中生', acceptanceResult: 'passed', acceptanceRemark: '验收合格' },
  { id: 'S003', type: 'in', batchId: 'B003', vaccineName: '乙肝疫苗', batchNo: '202512003', quantity: 3000, unit: '支', operator: '张医生', operateTime: '2025-12-25 09:15:00', remark: '采购入库', source: '葛兰素史克', acceptanceResult: 'passed', acceptanceRemark: '验收合格' },
  { id: 'S004', type: 'out', batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001', quantity: 1000, unit: '支', operator: '王医生', operateTime: '2026-02-01 11:00:00', remark: '分发至社区门诊', target: '朝阳区第一社区卫生服务中心' },
  { id: 'S005', type: 'out', batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001', quantity: 800, unit: '支', operator: '王医生', operateTime: '2026-02-10 15:30:00', remark: '分发至社区门诊', target: '海淀区中关村医院' },
  { id: 'S006', type: 'in', batchId: 'B004', vaccineName: '麻疹风疹联合疫苗', batchNo: '202603004', quantity: 2000, unit: '支', operator: '张医生', operateTime: '2026-03-10 08:45:00', remark: '采购入库', source: '上海生物', acceptanceResult: 'passed', acceptanceRemark: '验收合格' },
  { id: 'S007', type: 'out', batchId: 'B002', vaccineName: '新冠灭活疫苗', batchNo: '202602002', quantity: 1500, unit: '支', operator: '李医生', operateTime: '2026-03-15 10:00:00', remark: '分发至接种点', target: '西城区接种中心' },
  { id: 'S008', type: 'in', batchId: 'B006', vaccineName: '百白破联合疫苗', batchNo: '202604006', quantity: 4500, unit: '支', operator: '张医生', operateTime: '2026-04-05 13:30:00', remark: '采购入库', source: '武汉生物', acceptanceResult: 'passed', acceptanceRemark: '验收合格' },
]

export const coldStorages: ColdStorage[] = [
  { id: 'CS001', name: '1号冷库', location: '疾控中心A栋1层', capacity: 100000, currentTemp: 4.2, targetTempMin: 2, targetTempMax: 8, status: 'normal', lastUpdate: '2026-06-18 10:30:00' },
  { id: 'CS002', name: '2号冷库', location: '疾控中心A栋1层', capacity: 80000, currentTemp: 5.1, targetTempMin: 2, targetTempMax: 8, status: 'normal', lastUpdate: '2026-06-18 10:30:00' },
  { id: 'CS003', name: '3号冷库', location: '疾控中心B栋2层', capacity: 50000, currentTemp: 9.5, targetTempMin: 2, targetTempMax: 8, status: 'alarm', lastUpdate: '2026-06-18 10:30:00' },
  { id: 'CS004', name: '备用冷库', location: '疾控中心C栋1层', capacity: 60000, currentTemp: 3.8, targetTempMin: 2, targetTempMax: 8, status: 'normal', lastUpdate: '2026-06-18 10:30:00' },
  { id: 'CS005', name: '1号冷藏柜', location: '免疫规划科', capacity: 5000, currentTemp: 4.5, targetTempMin: 2, targetTempMax: 8, status: 'normal', lastUpdate: '2026-06-18 10:30:00' },
  { id: 'CS006', name: '2号冷藏柜', location: '免疫规划科', capacity: 5000, currentTemp: 7.8, targetTempMin: 2, targetTempMax: 8, status: 'warning', lastUpdate: '2026-06-18 10:30:00' },
]

export const generateTempRecords = (deviceId: string, deviceType: 'storage' | 'vehicle', deviceName: string, hours: number = 24): TemperatureRecord[] => {
  const records: TemperatureRecord[] = []
  const now = dayjs()
  const baseTemp = deviceType === 'storage' ? 4 : 5
  const fluctuation = deviceType === 'storage' ? 1.5 : 3

  for (let i = hours; i >= 0; i--) {
    const time = now.subtract(i, 'hour')
    const temp = baseTemp + (Math.random() - 0.5) * fluctuation * 2 + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 4 : -4) : 0)
    let status: 'normal' | 'warning' | 'alarm' = 'normal'
    if (temp < 2 || temp > 8) status = 'alarm'
    else if (temp < 3 || temp > 7) status = 'warning'

    records.push({
      id: generateId(),
      deviceId,
      deviceType,
      deviceName,
      temperature: parseFloat(temp.toFixed(1)),
      humidity: 45 + Math.random() * 20,
      recordTime: time.format('YYYY-MM-DD HH:mm:ss'),
      status
    })
  }
  return records
}

export const temperatureRecords: TemperatureRecord[] = [
  ...generateTempRecords('CS001', 'storage', '1号冷库', 48),
  ...generateTempRecords('CS002', 'storage', '2号冷库', 48),
  ...generateTempRecords('CS003', 'storage', '3号冷库', 48),
]

export const transportRecords: TransportRecord[] = [
  {
    id: 'T001', vehicleNo: '京A·12345', driver: '王师傅', startTime: '2026-06-18 08:00:00',
    startLocation: '市疾控中心', endLocation: '朝阳区第一社区卫生服务中心', status: 'transporting',
    vaccines: [
      { batchId: 'B002', vaccineName: '新冠灭活疫苗', batchNo: '202602002', quantity: 500 },
      { batchId: 'B003', vaccineName: '乙肝疫苗', batchNo: '202512003', quantity: 200 }
    ],
    temperatureRecords: generateTempRecords('V001', 'vehicle', '京A·12345', 3)
  },
  {
    id: 'T002', vehicleNo: '京A·67890', driver: '李师傅', startTime: '2026-06-17 09:00:00', endTime: '2026-06-17 14:30:00',
    startLocation: '市疾控中心', endLocation: '海淀区中关村医院', status: 'completed',
    vaccines: [
      { batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001', quantity: 800 },
      { batchId: 'B004', vaccineName: '麻疹风疹联合疫苗', batchNo: '202603004', quantity: 300 }
    ],
    temperatureRecords: generateTempRecords('V002', 'vehicle', '京A·67890', 6)
  },
  {
    id: 'T003', vehicleNo: '京A·11111', driver: '张师傅', startTime: '2026-06-16 10:00:00', endTime: '2026-06-16 16:00:00',
    startLocation: '市疾控中心', endLocation: '西城区接种中心', status: 'abnormal',
    vaccines: [
      { batchId: 'B006', vaccineName: '百白破联合疫苗', batchNo: '202604006', quantity: 1000 }
    ],
    temperatureRecords: generateTempRecords('V003', 'vehicle', '京A·11111', 6)
  },
]

export const alarmRecords: AlarmRecord[] = [
  { id: 'A001', deviceId: 'CS003', deviceName: '3号冷库', deviceType: '冷库', alarmType: 'overTemp', alarmLevel: 'critical', startTime: '2026-06-18 09:15:00', status: 'processing', handler: '赵工程师', temperature: 9.5 },
  { id: 'A002', deviceId: 'CS006', deviceName: '2号冷藏柜', deviceType: '冷藏柜', alarmType: 'overTemp', alarmLevel: 'warning', startTime: '2026-06-18 10:00:00', status: 'pending', temperature: 7.8 },
  { id: 'A003', deviceId: 'V003', deviceName: '京A·11111', deviceType: '冷藏车', alarmType: 'overTemp', alarmLevel: 'critical', startTime: '2026-06-16 12:30:00', endTime: '2026-06-16 13:15:00', status: 'resolved', handler: '李师傅', handleMethod: '停车检修制冷系统，启动备用制冷机组', handleTime: '2026-06-16 13:15:00', temperature: 12.3 },
  { id: 'A004', deviceId: 'CS002', deviceName: '2号冷库', deviceType: '冷库', alarmType: 'powerOff', alarmLevel: 'critical', startTime: '2026-06-15 22:10:00', endTime: '2026-06-15 22:25:00', status: 'resolved', handler: '赵工程师', handleMethod: '启动备用发电机，5分钟后恢复供电', handleTime: '2026-06-15 22:25:00', temperature: 5.1 },
  { id: 'A005', deviceId: 'V001', deviceName: '京A·12345', deviceType: '冷藏车', alarmType: 'deviceError', alarmLevel: 'warning', startTime: '2026-06-18 09:30:00', status: 'pending', temperature: 6.2 },
]

export const clinics: Clinic[] = [
  { id: 'C001', name: '朝阳区第一社区卫生服务中心', address: '朝阳区建国路88号', contact: '刘主任', phone: '010-12345678', level: 'community' },
  { id: 'C002', name: '海淀区中关村医院', address: '海淀区中关村大街27号', contact: '陈主任', phone: '010-87654321', level: 'district' },
  { id: 'C003', name: '西城区接种中心', address: '西城区复兴门内大街1号', contact: '王主任', phone: '010-11112222', level: 'district' },
  { id: 'C004', name: '东城区第一人民医院', address: '东城区王府井大街100号', contact: '李主任', phone: '010-33334444', level: 'district' },
  { id: 'C005', name: '丰台区妇幼保健院', address: '丰台区丰台路120号', contact: '周主任', phone: '010-55556666', level: 'community' },
  { id: 'C006', name: '北京市疾控中心接种门诊', address: '朝阳区和平街16号', contact: '赵主任', phone: '010-77778888', level: 'city' },
]

export const distributionRecords: DistributionRecord[] = [
  { id: 'D001', batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001', quantity: 1000, clinicId: 'C001', clinicName: '朝阳区第一社区卫生服务中心', distributor: '王医生', distributeTime: '2026-02-01 11:00:00', traceCodes: Array.from({ length: 10 }, (_, i) => `CN202601001${(i + 1).toString().padStart(5, '0')}`), receiveStatus: 'received', receiveTime: '2026-02-01 14:30:00', receiver: '刘主任' },
  { id: 'D002', batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001', quantity: 800, clinicId: 'C002', clinicName: '海淀区中关村医院', distributor: '王医生', distributeTime: '2026-02-10 15:30:00', traceCodes: Array.from({ length: 10 }, (_, i) => `CN202601001${(i + 1001).toString().padStart(5, '0')}`), receiveStatus: 'received', receiveTime: '2026-02-10 18:00:00', receiver: '陈主任' },
  { id: 'D003', batchId: 'B002', vaccineName: '新冠灭活疫苗', batchNo: '202602002', quantity: 1500, clinicId: 'C003', clinicName: '西城区接种中心', distributor: '李医生', distributeTime: '2026-03-15 10:00:00', traceCodes: Array.from({ length: 10 }, (_, i) => `CN202602002${(i + 1).toString().padStart(5, '0')}`), receiveStatus: 'received', receiveTime: '2026-03-15 13:30:00', receiver: '王主任' },
  { id: 'D004', batchId: 'B004', vaccineName: '麻疹风疹联合疫苗', batchNo: '202603004', quantity: 500, clinicId: 'C004', clinicName: '东城区第一人民医院', distributor: '张医生', distributeTime: '2026-04-01 09:00:00', traceCodes: Array.from({ length: 10 }, (_, i) => `CN202603004${(i + 1).toString().padStart(5, '0')}`), receiveStatus: 'pending' },
  { id: 'D005', batchId: 'B006', vaccineName: '百白破联合疫苗', batchNo: '202604006', quantity: 600, clinicId: 'C005', clinicName: '丰台区妇幼保健院', distributor: '李医生', distributeTime: '2026-05-10 14:00:00', traceCodes: Array.from({ length: 10 }, (_, i) => `CN202604006${(i + 1).toString().padStart(5, '0')}`), receiveStatus: 'received', receiveTime: '2026-05-10 16:30:00', receiver: '周主任' },
]

export const chainBreakEvents: ChainBreakEvent[] = [
  { id: 'E001', eventType: 'temperature', description: '3号冷库制冷系统故障，温度超过8℃达2小时', location: '市疾控中心3号冷库', startTime: '2026-06-18 09:15:00', affectedBatches: ['B007', 'B008'], status: 'processing', handler: '赵工程师' },
  { id: 'E002', eventType: 'transport', description: '冷藏车京A·11111运输途中制冷系统故障，超温45分钟', location: '西三环途中', startTime: '2026-06-16 12:30:00', endTime: '2026-06-16 13:15:00', affectedBatches: ['B006'], status: 'closed', handler: '李师傅', result: '已对该批次疫苗进行评估，部分疫苗报废处理，其余重新检验后使用' },
  { id: 'E003', eventType: 'storage', description: '2号冷库断电15分钟，启动备用电源恢复', location: '市疾控中心2号冷库', startTime: '2026-06-15 22:10:00', endTime: '2026-06-15 22:25:00', affectedBatches: ['B001', 'B002'], status: 'closed', handler: '赵工程师', result: '断电时间较短，库温波动在正常范围内，疫苗质量未受影响' },
]

export const vaccinationStats: VaccinationStats[] = [
  { id: 'ST001', date: '2026-06-17', vaccineName: '新冠灭活疫苗', batchNo: '202601001', clinicName: '朝阳区第一社区卫生服务中心', doses: 156, population: '18-59岁人群', coverageRate: 89.5 },
  { id: 'ST002', date: '2026-06-17', vaccineName: '乙肝疫苗', batchNo: '202512003', clinicName: '海淀区中关村医院', doses: 45, population: '新生儿', coverageRate: 98.2 },
  { id: 'ST003', date: '2026-06-17', vaccineName: '百白破联合疫苗', batchNo: '202604006', clinicName: '丰台区妇幼保健院', doses: 78, population: '婴幼儿', coverageRate: 95.6 },
  { id: 'ST004', date: '2026-06-16', vaccineName: '新冠灭活疫苗', batchNo: '202602002', clinicName: '西城区接种中心', doses: 234, population: '18-59岁人群', coverageRate: 91.3 },
  { id: 'ST005', date: '2026-06-16', vaccineName: '麻疹风疹联合疫苗', batchNo: '202603004', clinicName: '东城区第一人民医院', doses: 56, population: '儿童', coverageRate: 97.8 },
  { id: 'ST006', date: '2026-06-15', vaccineName: '流感疫苗', batchNo: '202605007', clinicName: '北京市疾控中心接种门诊', doses: 120, population: '老年人', coverageRate: 76.4 },
]

export const destroyRecords: DestroyRecord[] = [
  { id: 'DS001', batchId: 'B005', vaccineName: '脊髓灰质炎灭活疫苗', batchNo: '202506005', quantity: 1500, reason: '超过有效期', destroyMethod: '高温灭菌后填埋', operator: '张医生', supervisor: '李科长', destroyTime: '2026-06-10 14:00:00', remark: '全程录像，双人监督' },
  { id: 'DS002', batchId: 'B006', vaccineName: '百白破联合疫苗', batchNo: '202604006', quantity: 50, reason: '冷链断链超温', destroyMethod: '高温灭菌后填埋', operator: '李医生', supervisor: '王主任', destroyTime: '2026-06-17 10:30:00', remark: '运输途中超温45分钟，经评估报废' },
]

export const traceCodeRecords: TraceCodeRecord[] = [
  {
    id: 'TC001', traceCode: 'CN2026010010001', batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001',
    status: 'vaccinated', currentLocation: '朝阳区第一社区卫生服务中心',
    scanHistory: [
      { time: '2026-01-20 10:30:00', location: '市疾控中心', operator: '张医生', action: '入库扫描' },
      { time: '2026-02-01 11:00:00', location: '市疾控中心', operator: '王医生', action: '出库扫描' },
      { time: '2026-02-01 14:30:00', location: '朝阳区第一社区卫生服务中心', operator: '刘主任', action: '接收扫描' },
      { time: '2026-02-15 09:30:00', location: '朝阳区第一社区卫生服务中心', operator: '护士小王', action: '接种扫描' }
    ]
  },
  {
    id: 'TC002', traceCode: 'CN2026010010002', batchId: 'B001', vaccineName: '新冠灭活疫苗', batchNo: '202601001',
    status: 'distributed', currentLocation: '海淀区中关村医院',
    scanHistory: [
      { time: '2026-01-20 10:30:00', location: '市疾控中心', operator: '张医生', action: '入库扫描' },
      { time: '2026-02-10 15:30:00', location: '市疾控中心', operator: '王医生', action: '出库扫描' },
      { time: '2026-02-10 18:00:00', location: '海淀区中关村医院', operator: '陈主任', action: '接收扫描' }
    ]
  },
  {
    id: 'TC003', traceCode: 'CN2026020020001', batchId: 'B002', vaccineName: '新冠灭活疫苗', batchNo: '202602002',
    status: 'inStock', currentLocation: '市疾控中心1号冷库',
    scanHistory: [
      { time: '2026-02-15 14:20:00', location: '市疾控中心', operator: '李医生', action: '入库扫描' }
    ]
  }
]

export const getNearExpireBatches = () => vaccineBatches.filter(b => b.status === 'nearExpire')
export const getExpiredBatches = () => vaccineBatches.filter(b => b.status === 'expired')
export const getActiveAlarms = () => alarmRecords.filter(a => a.status !== 'resolved')
export const getPendingDistributions = () => distributionRecords.filter(d => d.status === 'pending')
