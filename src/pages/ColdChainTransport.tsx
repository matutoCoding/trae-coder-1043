import { useState, useMemo } from 'react'
import {
  Tabs, Table, Button, Form, Input, Select, Modal, Space,
  message, Tag, Card, Row, Col, Statistic, InputNumber,
  DatePicker, Tooltip, Typography
} from 'antd'
import {
  TruckOutlined, PlusOutlined, SearchOutlined, EyeOutlined,
  EnvironmentOutlined, UserOutlined, ClockCircleOutlined,
  CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined,
  DashboardOutlined, HistoryOutlined, CarOutlined,
  ThunderboltOutlined, AuditOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import { generateTempRecords } from '@/mock/data'
import type { TransportRecord, TemperatureRecord, VaccineBatch } from '@/types'
import type { ColumnsType } from 'antd/es/table'

const { Option } = Select
const { TextArea } = Input
const { RangePicker } = DatePicker
const { Title, Text } = Typography

type TabKey = 'register' | 'monitor' | 'history'

const getStatusColor = (status: TransportRecord['status']) => {
  switch (status) {
    case 'transporting': return 'processing'
    case 'completed': return 'success'
    case 'abnormal': return 'error'
    default: return 'default'
  }
}

const getStatusText = (status: TransportRecord['status']) => {
  switch (status) {
    case 'transporting': return '运输中'
    case 'completed': return '已完成'
    case 'abnormal': return '异常'
    default: return '未知'
  }
}

const getStatusIcon = (status: TransportRecord['status']) => {
  switch (status) {
    case 'transporting': return <TruckOutlined />
    case 'completed': return <CheckCircleOutlined />
    case 'abnormal': return <ExclamationCircleOutlined />
    default: return null
  }
}

const getTempStatusColor = (temp: number) => {
  if (temp < 2 || temp > 8) return '#ff4d4f'
  if (temp < 3 || temp > 7) return '#faad14'
  return '#52c41a'
}

const getDuration = (startTime: string, endTime?: string) => {
  const start = dayjs(startTime)
  const end = endTime ? dayjs(endTime) : dayjs()
  const diff = end.diff(start, 'minute')
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

const getCurrentTemp = (records: TemperatureRecord[]) => {
  if (records.length === 0) return null
  return records[records.length - 1].temperature
}

const hasTemperatureOverLimit = (records: TemperatureRecord[]) => {
  return records.some(r => r.temperature < 2 || r.temperature > 8)
}

const getTemperatureChartOption = (records: TemperatureRecord[], vehicleNo: string) => {
  const times = records.map(r => dayjs(r.recordTime).format('MM-DD HH:mm'))
  const temps = records.map(r => r.temperature)

  return {
    title: {
      text: `${vehicleNo} 温度监控曲线`,
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const data = params[0]
        const temp = data.value
        let status = '正常'
        if (temp < 2 || temp > 8) status = '超温报警'
        else if (temp < 3 || temp > 7) status = '温度预警'
        return `${data.name}<br/>温度: ${temp}℃<br/>状态: ${status}`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { rotate: 30, fontSize: 10, interval: Math.floor(times.length / 8) }
    },
    yAxis: {
      type: 'value',
      name: '温度(℃)',
      min: 0, max: 12,
      axisLabel: { formatter: '{value}℃' }
    },
    visualMap: {
      show: false,
      pieces: [
        { lte: 2, color: '#ff4d4f' },
        { gt: 2, lte: 3, color: '#faad14' },
        { gt: 3, lte: 7, color: '#52c41a' },
        { gt: 7, lte: 8, color: '#faad14' },
        { gt: 8, color: '#ff4d4f' }
      ]
    },
    series: [{
      name: '温度',
      type: 'line',
      data: temps,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
          ]
        }
      },
      markArea: {
        silent: true,
        data: [[{ yAxis: 2, itemStyle: { color: 'rgba(82, 196, 26, 0.1)' } }, { yAxis: 8 }]]
      },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          { yAxis: 2, lineStyle: { color: '#52c41a', type: 'dashed', width: 1 }, label: { formatter: '下限 2℃', position: 'start', fontSize: 10, color: '#52c41a' } },
          { yAxis: 8, lineStyle: { color: '#52c41a', type: 'dashed', width: 1 }, label: { formatter: '上限 8℃', position: 'start', fontSize: 10, color: '#52c41a' } }
        ]
      }
    }]
  }
}

export default function ColdChainTransport() {
  const [activeTab, setActiveTab] = useState<TabKey>('register')
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [tempChartModalOpen, setTempChartModalOpen] = useState(false)
  const [addTempModalOpen, setAddTempModalOpen] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [abnormalModalOpen, setAbnormalModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<TransportRecord | null>(null)
  const [registerForm] = Form.useForm()
  const [addTempForm] = Form.useForm()
  const [completeForm] = Form.useForm()
  const [abnormalForm] = Form.useForm()
  const [registerSearch, setRegisterSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const {
    transportRecords, vaccineBatches, addTransportRecord,
    temperatureRecords, addTemperatureRecord, updateVaccineBatch,
    updateTransportRecord
  } = useAppStore()

  const availableBatches = useMemo(() => {
    return vaccineBatches.filter(b => b.status !== 'expired' && b.status !== 'destroyed' && b.quantity > 0)
  }, [vaccineBatches])

  const registerRecords = useMemo(() => {
    return transportRecords
      .filter(r => !registerSearch ||
        r.vehicleNo.includes(registerSearch) ||
        r.driver.includes(registerSearch) ||
        r.startLocation.includes(registerSearch) ||
        r.endLocation.includes(registerSearch) ||
        r.vaccines.some(v => v.vaccineName.includes(registerSearch))
      )
      .sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf())
  }, [transportRecords, registerSearch])

  const transportingRecords = useMemo(() => {
    return transportRecords.filter(r => r.status === 'transporting')
  }, [transportRecords])

  const historyRecords = useMemo(() => {
    return transportRecords
      .filter(r => !statusFilter || r.status === statusFilter)
      .filter(r => !historySearch ||
        r.vehicleNo.includes(historySearch) ||
        r.driver.includes(historySearch) ||
        r.startLocation.includes(historySearch) ||
        r.endLocation.includes(historySearch) ||
        r.vaccines.some(v => v.vaccineName.includes(historySearch))
      )
      .filter(r => {
        if (!dateRange) return true
        const startTime = dayjs(r.startTime)
        return startTime.isAfter(dateRange[0].startOf('day')) && startTime.isBefore(dateRange[1].endOf('day'))
      })
      .sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf())
  }, [transportRecords, historySearch, statusFilter, dateRange])

  const handleRegisterSubmit = async () => {
    try {
      const values = await registerForm.validateFields()
      const selectedVaccines: TransportRecord['vaccines'] = values.selectedBatches.map((batchId: string) => {
        const batch = vaccineBatches.find(b => b.id === batchId)
        const quantity = values[`quantity_${batchId}`] || 0
        return { batchId, vaccineName: batch?.vaccineName || '', batchNo: batch?.batchNo || '', quantity }
      }).filter((v: { quantity: number }) => v.quantity > 0)

      if (selectedVaccines.length === 0) {
        message.error('请至少选择一个疫苗批次并填写数量')
        return
      }

      const newTempRecords = generateTempRecords(values.vehicleNo, 'vehicle', values.vehicleNo, 0)
      const record: Omit<TransportRecord, 'id'> = {
        vehicleNo: values.vehicleNo,
        driver: values.driver,
        startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        startLocation: values.startLocation,
        endLocation: Array.isArray(values.endLocation) ? values.endLocation.join('、') : (values.endLocation || ''),
        status: 'transporting',
        vaccines: selectedVaccines,
        temperatureRecords: newTempRecords
      }

      addTransportRecord(record)

      selectedVaccines.forEach(v => {
        const batch = vaccineBatches.find(b => b.id === v.batchId)
        if (batch) {
          updateVaccineBatch(batch.id, {
            quantity: Math.max(0, batch.quantity - v.quantity),
            inTransitQuantity: (batch.inTransitQuantity || 0) + v.quantity
          })
        }
      })

      newTempRecords.forEach(tr => {
        const { id, ...tempRecord } = tr
        addTemperatureRecord(tempRecord)
      })

      message.success('运输登记成功')
      setRegisterModalOpen(false)
      registerForm.resetFields()
    } catch (error) {
      console.error('运输登记失败:', error)
    }
  }

  const handleViewTempChart = (record: TransportRecord) => {
    setSelectedRecord(record)
    setTempChartModalOpen(true)
  }

  const openAddTemp = (record: TransportRecord) => {
    setSelectedRecord(record)
    addTempForm.resetFields()
    addTempForm.setFieldsValue({
      temperature: 5,
      recordTime: dayjs()
    })
    setAddTempModalOpen(true)
  }

  const handleAddTemp = async () => {
    if (!selectedRecord) return
    try {
      const values = await addTempForm.validateFields()
      const recordTime = values.recordTime
        ? values.recordTime.format('YYYY-MM-DD HH:mm:ss')
        : dayjs().format('YYYY-MM-DD HH:mm:ss')
      const temp = parseFloat(values.temperature)
      let status: 'normal' | 'warning' | 'alarm' = 'normal'
      if (temp < 2 || temp > 8) status = 'alarm'
      else if (temp < 3 || temp > 7) status = 'warning'

      const newTemp: TemperatureRecord = {
        id: '',
        deviceId: selectedRecord.vehicleNo,
        deviceType: 'vehicle',
        deviceName: selectedRecord.vehicleNo,
        temperature: temp,
        humidity: values.humidity ? parseFloat(values.humidity) : undefined,
        recordTime,
        status
      }

      const { id, ...tempRecord } = newTemp
      addTemperatureRecord(tempRecord)

      const updatedTemps = [...selectedRecord.temperatureRecords, { ...tempRecord, id: Math.random().toString(36).slice(2, 10).toUpperCase() }]
      updateTransportRecord(selectedRecord.id, { temperatureRecords: updatedTemps })

      message.success(`已追加温度点 ${temp}℃ (${recordTime})`)
      setAddTempModalOpen(false)
    } catch (error) {
      console.error('追加温度点失败:', error)
    }
  }

  const openComplete = (record: TransportRecord) => {
    setSelectedRecord(record)
    completeForm.resetFields()
    const overLimit = hasTemperatureOverLimit(record.temperatureRecords)
    completeForm.setFieldsValue({
      conclusion: overLimit
        ? '运输途中存在温度超标，建议对涉及批次进行质量评估后再使用'
        : '运输全程温度符合2-8℃要求，疫苗质量合格',
      temperatureOverLimit: overLimit
    })
    setCompleteModalOpen(true)
  }

  const handleCompleteSubmit = async () => {
    if (!selectedRecord) return
    try {
      const values = await completeForm.validateFields()
      const endTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const { vaccineBatches } = useAppStore.getState()

      selectedRecord.vaccines.forEach(v => {
        const batch = vaccineBatches.find(b => b.id === v.batchId)
        if (batch) {
          updateVaccineBatch(batch.id, {
            inTransitQuantity: Math.max(0, (batch.inTransitQuantity || 0) - v.quantity)
          })
        }
      })

      updateTransportRecord(selectedRecord.id, {
        status: 'completed',
        endTime,
        conclusion: values.conclusion,
        temperatureOverLimit: !!values.temperatureOverLimit
      })
      message.success('运输已完成，结论已记录')
      setCompleteModalOpen(false)
    } catch (error) {
      console.error('完成运输失败:', error)
    }
  }

  const openAbnormal = (record: TransportRecord) => {
    setSelectedRecord(record)
    abnormalForm.resetFields()
    abnormalForm.setFieldsValue({
      abnormalRemark: '运输途中发生异常，请补充详细描述',
      temperatureOverLimit: hasTemperatureOverLimit(record.temperatureRecords)
    })
    setAbnormalModalOpen(true)
  }

  const handleAbnormalSubmit = async () => {
    if (!selectedRecord) return
    try {
      const values = await abnormalForm.validateFields()
      const endTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const { vaccineBatches } = useAppStore.getState()

      selectedRecord.vaccines.forEach(v => {
        const batch = vaccineBatches.find(b => b.id === v.batchId)
        if (batch) {
          updateVaccineBatch(batch.id, {
            quantity: batch.quantity + v.quantity,
            inTransitQuantity: Math.max(0, (batch.inTransitQuantity || 0) - v.quantity)
          })
        }
      })

      updateTransportRecord(selectedRecord.id, {
        status: 'abnormal',
        endTime,
        abnormalRemark: values.abnormalRemark,
        conclusion: values.conclusion || '运输异常终止，涉及疫苗已退回冷库待评估',
        temperatureOverLimit: !!values.temperatureOverLimit
      })
      message.success('已标记为异常，疫苗已退回库存并记录说明')
      setAbnormalModalOpen(false)
    } catch (error) {
      console.error('标记异常失败:', error)
    }
  }

  const viewRecordDetail = (record: TransportRecord) => {
    const overLimit = hasTemperatureOverLimit(record.temperatureRecords)
    Modal.info({
      title: '运输详情',
      width: 650,
      content: (
        <div style={{ lineHeight: 2 }}>
          <Row gutter={16}>
            <Col span={12}>
              <p><strong>车牌号：</strong>{record.vehicleNo}</p>
              <p><strong>司机：</strong>{record.driver}</p>
              <p><strong>出发时间：</strong>{record.startTime}</p>
              <p><strong>到达时间：</strong>{record.endTime || '-'}</p>
            </Col>
            <Col span={12}>
              <p><strong>运输时长：</strong>{getDuration(record.startTime, record.endTime)}</p>
              <p><strong>出发地：</strong>{record.startLocation}</p>
              <p><strong>目的地：</strong>{record.endLocation}</p>
              <p><strong>状态：</strong>
                <Tag color={getStatusColor(record.status)} icon={getStatusIcon(record.status)}>
                  {getStatusText(record.status)}
                </Tag>
              </p>
            </Col>
          </Row>
          <p style={{ marginTop: 12 }}><strong>运输疫苗：</strong></p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {record.vaccines.map((v, idx) => (
              <li key={idx}>{v.vaccineName}（批号：{v.batchNo}，数量：{v.quantity}支）</li>
            ))}
          </ul>
          {record.temperatureRecords.length > 0 && (
            <p style={{ marginTop: 8 }}>
              <strong>当前温度：</strong>
              <span style={{ color: getTempStatusColor(getCurrentTemp(record.temperatureRecords) || 0), fontWeight: 600 }}>
                {getCurrentTemp(record.temperatureRecords)}℃
              </span>
              {overLimit && <Tag color="error" style={{ marginLeft: 8 }}>温度超标</Tag>}
            </p>
          )}
          {(record.conclusion || record.abnormalRemark) && (
            <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 6 }}>
              <p style={{ margin: 0 }}><strong>最终结论：</strong>{record.conclusion}</p>
              {record.abnormalRemark && (
                <p style={{ margin: '4px 0 0 0' }}><strong>异常说明：</strong>{record.abnormalRemark}</p>
              )}
              {typeof record.temperatureOverLimit === 'boolean' && (
                <p style={{ margin: '4px 0 0 0' }}>
                  <strong>温度超标：</strong>
                  <Tag color={record.temperatureOverLimit ? 'error' : 'success'}>
                    {record.temperatureOverLimit ? '是' : '否'}
                  </Tag>
                </p>
              )}
            </div>
          )}
        </div>
      )
    })
  }

  const actionRender = (record: TransportRecord) => (
    <Space size="small" wrap>
      <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => viewRecordDetail(record)}>详情</Button>
      <Button type="link" size="small" icon={<DashboardOutlined />} onClick={() => handleViewTempChart(record)}>温度曲线</Button>
      {record.status === 'transporting' && (
        <>
          <Button type="link" size="small" icon={<ThunderboltOutlined />} onClick={() => openAddTemp(record)}>追加温度</Button>
          <Button type="link" size="small" onClick={() => openComplete(record)} style={{ color: '#52c41a' }}>完成</Button>
          <Button type="link" size="small" danger onClick={() => openAbnormal(record)}>异常</Button>
        </>
      )}
    </Space>
  )

  const registerColumns: ColumnsType<TransportRecord> = [
    { title: '车牌号', dataIndex: 'vehicleNo', key: 'vehicleNo', width: 110 },
    { title: '司机', dataIndex: 'driver', key: 'driver', width: 90 },
    { title: '出发时间', dataIndex: 'startTime', key: 'startTime', width: 160 },
    { title: '出发地', dataIndex: 'startLocation', key: 'startLocation', width: 130 },
    { title: '目的地', dataIndex: 'endLocation', key: 'endLocation', width: 150 },
    {
      title: '运输疫苗', key: 'vaccines', width: 190,
      render: (_val, record) => (
        <Tooltip title={record.vaccines.map(v => `${v.vaccineName} (${v.batchNo}) x${v.quantity}`).join('\n')}>
          <Text ellipsis style={{ maxWidth: 170 }}>{record.vaccines.map(v => v.vaccineName).join('、')}</Text>
        </Tooltip>
      )
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: TransportRecord['status']) => (
        <Tag color={getStatusColor(s)} icon={getStatusIcon(s)}>{getStatusText(s)}</Tag>
      )
    },
    { title: '操作', key: 'action', width: 240, render: (_val, record) => actionRender(record) }
  ]

  const historyColumns: ColumnsType<TransportRecord> = [
    { title: '车牌号', dataIndex: 'vehicleNo', key: 'vehicleNo', width: 110 },
    { title: '司机', dataIndex: 'driver', key: 'driver', width: 90 },
    { title: '出发时间', dataIndex: 'startTime', key: 'startTime', width: 160 },
    {
      title: '到达时间', dataIndex: 'endTime', key: 'endTime', width: 160,
      render: (val?: string) => val || '-'
    },
    { title: '出发地', dataIndex: 'startLocation', key: 'startLocation', width: 130 },
    { title: '目的地', dataIndex: 'endLocation', key: 'endLocation', width: 150 },
    {
      title: '运输疫苗', key: 'vaccines', width: 190,
      render: (_val, record) => (
        <Tooltip title={record.vaccines.map(v => `${v.vaccineName} (${v.batchNo}) x${v.quantity}`).join('\n')}>
          <Text ellipsis style={{ maxWidth: 170 }}>{record.vaccines.map(v => v.vaccineName).join('、')}</Text>
        </Tooltip>
      )
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: TransportRecord['status']) => (
        <Tag color={getStatusColor(s)} icon={getStatusIcon(s)}>{getStatusText(s)}</Tag>
      )
    },
    {
      title: '温度', key: 'tempStatus', width: 90,
      render: (_, r) => {
        const over = hasTemperatureOverLimit(r.temperatureRecords)
        if (r.status === 'transporting') return <span style={{ color: '#999' }}>进行中</span>
        return <Tag color={over ? 'error' : 'success'}>{over ? '超标' : '合格'}</Tag>
      }
    },
    { title: '操作', key: 'action', width: 220, render: (_val, record) => actionRender(record) }
  ]

  const tabItems = [
    {
      key: 'register',
      label: <Space><CarOutlined />冷藏车运输登记</Space>,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input
              placeholder="搜索车牌号、司机、出发地、目的地、疫苗名称"
              prefix={<SearchOutlined />}
              value={registerSearch}
              onChange={(e) => setRegisterSearch(e.target.value)}
              style={{ width: 350 }}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setRegisterModalOpen(true)}>新增运输登记</Button>
          </div>
          <Table
            columns={registerColumns}
            dataSource={registerRecords}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条记录` }}
            scroll={{ x: 1250 }}
          />
        </div>
      )
    },
    {
      key: 'monitor',
      label: (
        <Space>
          <DashboardOutlined />在途运输监控
          {transportingRecords.length > 0 && <Tag color="processing" style={{ marginLeft: 4 }}>{transportingRecords.length}</Tag>}
        </Space>
      ),
      children: (
        <div>
          {transportingRecords.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '60px 0' }}>
              <TruckOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
              <p style={{ color: '#999' }}>暂无在途运输车辆</p>
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {transportingRecords.map(record => {
                const currentTemp = getCurrentTemp(record.temperatureRecords)
                const overLimit = currentTemp !== null && (currentTemp < 2 || currentTemp > 8)
                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={record.id}>
                    <Card
                      hoverable
                      onClick={() => handleViewTempChart(record)}
                      style={{ borderRadius: '8px', border: `1px solid ${overLimit ? '#ff4d4f' : '#d9d9d9'}`, cursor: 'pointer' }}
                      bodyStyle={{ padding: '16px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{record.vehicleNo}</div>
                          <div style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center' }}>
                            <UserOutlined style={{ marginRight: 4 }} />{record.driver}
                          </div>
                        </div>
                        <Tag color="processing" icon={<TruckOutlined />}>运输中</Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '36px', fontWeight: 700, color: currentTemp ? getTempStatusColor(currentTemp) : '#999' }}>
                          {currentTemp !== null ? currentTemp : '-'}
                        </span>
                        <span style={{ fontSize: '18px', color: '#666' }}>℃</span>
                        {overLimit && <Tag color="error">超标</Tag>}
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <Statistic
                          title={<span style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center' }}><ClockCircleOutlined style={{ marginRight: 4 }} />运输时长</span>}
                          value={getDuration(record.startTime)}
                          valueStyle={{ fontSize: '14px', fontWeight: 500 }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        <EnvironmentOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                        {record.startLocation} → {record.endLocation}
                      </div>
                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>运输疫苗：</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {record.vaccines.slice(0, 2).map((v, idx) => (
                            <Tag key={idx} color="blue" style={{ fontSize: 12 }}>{v.vaccineName}</Tag>
                          ))}
                          {record.vaccines.length > 2 && <Tag style={{ fontSize: 12 }}>+{record.vaccines.length - 2}</Tag>}
                        </div>
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Button type="primary" size="small" icon={<DashboardOutlined />}>温度曲线</Button>
                        <Button size="small" icon={<ThunderboltOutlined />} onClick={(e) => { e.stopPropagation(); openAddTemp(record) }}>追加点</Button>
                      </div>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </div>
      )
    },
    {
      key: 'history',
      label: <Space><HistoryOutlined />运输历史记录</Space>,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input
              placeholder="搜索车牌号、司机、出发地、目的地、疫苗名称"
              prefix={<SearchOutlined />}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ width: 350 }}
              allowClear
            />
            <Select
              placeholder="状态筛选"
              value={statusFilter || undefined}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="transporting">运输中</Option>
              <Option value="completed">已完成</Option>
              <Option value="abnormal">异常</Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: 280 }}
            />
            <Button onClick={() => { setHistorySearch(''); setStatusFilter(''); setDateRange(null) }}>重置</Button>
          </div>
          <Table
            columns={historyColumns}
            dataSource={historyRecords}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条记录` }}
            scroll={{ x: 1400 }}
          />
        </div>
      )
    }
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: '20px' }}>
        <TruckOutlined style={{ marginRight: 8 }} />冷链运输管理
      </Title>

      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as TabKey)} items={tabItems} />

      <Modal
        title="新增运输登记"
        open={registerModalOpen}
        onOk={handleRegisterSubmit}
        onCancel={() => { setRegisterModalOpen(false); registerForm.resetFields() }}
        width={700}
        okText="确认登记"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={registerForm} layout="vertical" initialValues={{ startLocation: '市疾控中心', selectedBatches: [] }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="vehicleNo" label="车牌号" rules={[{ required: true, message: '请输入车牌号' }]}>
              <Input placeholder="请输入车牌号，如：京A·12345" />
            </Form.Item>
            <Form.Item name="driver" label="司机" rules={[{ required: true, message: '请输入司机姓名' }]}>
              <Input placeholder="请输入司机姓名" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="startLocation" label="出发地" rules={[{ required: true, message: '请输入出发地' }]}>
              <Input placeholder="请输入出发地" />
            </Form.Item>
            <Form.Item name="endLocation" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
              <Select placeholder="请选择或输入目的地" mode="tags" maxTagCount={1} allowClear>
                <Option value="朝阳区第一社区卫生服务中心">朝阳区第一社区卫生服务中心</Option>
                <Option value="海淀区中关村医院">海淀区中关村医院</Option>
                <Option value="西城区接种中心">西城区接种中心</Option>
                <Option value="东城区第一人民医院">东城区第一人民医院</Option>
                <Option value="丰台区妇幼保健院">丰台区妇幼保健院</Option>
                <Option value="北京市疾控中心接种门诊">北京市疾控中心接种门诊</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="selectedBatches" label="选择运输疫苗（可多选批次）" rules={[{ required: true, message: '请选择至少一个疫苗批次' }]}>
            <Select mode="multiple" placeholder="请选择疫苗批次" showSearch optionFilterProp="children" style={{ width: '100%' }}>
              {availableBatches.map(batch => (
                <Option key={batch.id} value={batch.id}>
                  {batch.vaccineName} - {batch.batchNo} (库存: {batch.quantity}{batch.unit})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.selectedBatches !== curr.selectedBatches}>
            {({ getFieldValue }) => {
              const selectedBatches = getFieldValue('selectedBatches') as string[] || []
              if (selectedBatches.length === 0) return null
              return (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: 12 }}>填写运输数量：</div>
                  {selectedBatches.map(batchId => {
                    const batch = vaccineBatches.find(b => b.id === batchId)
                    if (!batch) return null
                    return (
                      <div key={batchId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#666' }}>{batch.vaccineName} ({batch.batchNo})</div>
                        <Form.Item name={`quantity_${batchId}`} style={{ marginBottom: 0 }} rules={[{ required: true, message: '请输入数量' }]}>
                          <InputNumber min={1} max={batch.quantity} style={{ width: '100%' }} placeholder={`库存${batch.quantity}${batch.unit}`} />
                        </Form.Item>
                        <div style={{ fontSize: '12px', color: '#999' }}>单位：{batch.unit}</div>
                      </div>
                    )
                  })}
                </div>
              )
            }}
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="追加运输温度点"
        open={addTempModalOpen}
        onOk={handleAddTemp}
        onCancel={() => setAddTempModalOpen(false)}
        okText="确认追加"
        cancelText="取消"
        width={500}
      >
        <Form form={addTempForm} layout="vertical">
          <div style={{ marginBottom: 12, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
            <Space>
              <TruckOutlined />
              <span>运输车辆：<strong>{selectedRecord?.vehicleNo}</strong></span>
              <Tag color="processing">{selectedRecord?.driver}</Tag>
            </Space>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="temperature" label="温度(℃)" rules={[{ required: true, message: '请输入温度' }]}>
              <InputNumber min={-10} max={30} step={0.1} precision={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="humidity" label="湿度(%)">
              <InputNumber min={0} max={100} step={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="recordTime" label="记录时间" rules={[{ required: true, message: '请选择时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
          </Form.Item>
          <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
            提示：温度超过 2-8℃ 范围将自动标记为温度超标
          </p>
        </Form>
      </Modal>

      <Modal
        title="完成运输登记"
        open={completeModalOpen}
        onOk={handleCompleteSubmit}
        onCancel={() => setCompleteModalOpen(false)}
        okText="确认完成"
        cancelText="取消"
        okButtonProps={{ style: { background: '#52c41a' } }}
        width={550}
      >
        <Form form={completeForm} layout="vertical">
          {selectedRecord && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
              <p style={{ margin: 0 }}>
                <TruckOutlined style={{ color: '#52c41a' }} /> 运输车辆：<strong>{selectedRecord.vehicleNo}</strong>，司机：<strong>{selectedRecord.driver}</strong>
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                起点：{selectedRecord.startLocation} → 终点：{selectedRecord.endLocation}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                共运输 {selectedRecord.vaccines.length} 个疫苗批次
              </p>
            </div>
          )}
          <Form.Item name="temperatureOverLimit" label="温度超标判定" rules={[{ required: true, message: '请选择' }]}>
            <Select>
              <Option value={false}>全程温度合格（2-8℃范围内）</Option>
              <Option value={true}>存在温度超标（＜2℃或＞8℃）</Option>
            </Select>
          </Form.Item>
          <Form.Item name="conclusion" label="运输结论与质量评估" rules={[{ required: true, message: '请输入结论' }]}>
            <TextArea rows={4} placeholder="请输入运输最终结论，如：运输全程温度符合2-8℃要求，疫苗质量合格可继续使用" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="标记运输异常"
        open={abnormalModalOpen}
        onOk={handleAbnormalSubmit}
        onCancel={() => setAbnormalModalOpen(false)}
        okText="确认异常"
        okType="danger"
        cancelText="取消"
        width={550}
      >
        <Form form={abnormalForm} layout="vertical">
          {selectedRecord && (
            <div style={{ marginBottom: 16, padding: 12, background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
              <p style={{ margin: 0 }}>
                <WarningOutlined style={{ color: '#ff4d4f' }} /> 异常车辆：<strong>{selectedRecord.vehicleNo}</strong>，司机：<strong>{selectedRecord.driver}</strong>
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                涉及的疫苗将自动退回冷库库存，后续需做质量评估
              </p>
            </div>
          )}
          <Form.Item name="temperatureOverLimit" label="温度超标判定">
            <Select>
              <Option value={false}>温度合格（2-8℃范围内）</Option>
              <Option value={true}>存在温度超标（＜2℃或＞8℃）</Option>
            </Select>
          </Form.Item>
          <Form.Item name="abnormalRemark" label="异常原因与说明" rules={[{ required: true, message: '请输入异常说明' }]}>
            <TextArea rows={3} placeholder="请详细描述异常情况，如：车辆故障、交通事故、制冷系统失效等" />
          </Form.Item>
          <Form.Item name="conclusion" label="处理结论">
            <TextArea rows={3} placeholder="请输入处理结论，如：运输异常终止，疫苗退回冷库待评估" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="温度监控曲线"
        open={tempChartModalOpen}
        onCancel={() => { setTempChartModalOpen(false); setSelectedRecord(null) }}
        footer={null}
        width={900}
        destroyOnClose
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <Row gutter={24}>
                <Col span={6}><Statistic title="车牌号" value={selectedRecord.vehicleNo} valueStyle={{ fontSize: '16px' }} /></Col>
                <Col span={6}><Statistic title="司机" value={selectedRecord.driver} valueStyle={{ fontSize: '16px' }} /></Col>
                <Col span={6}><Statistic title="运输时长" value={getDuration(selectedRecord.startTime, selectedRecord.endTime)} valueStyle={{ fontSize: '16px' }} /></Col>
                <Col span={6}>
                  <Statistic
                    title="当前温度"
                    value={getCurrentTemp(selectedRecord.temperatureRecords) ?? '-'}
                    suffix="℃"
                    valueStyle={{
                      fontSize: '16px',
                      color: getTempStatusColor(getCurrentTemp(selectedRecord.temperatureRecords) || 0)
                    }}
                  />
                </Col>
              </Row>
              {(selectedRecord.conclusion || selectedRecord.abnormalRemark || typeof selectedRecord.temperatureOverLimit === 'boolean') && (
                <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 6, fontSize: 13 }}>
                  {typeof selectedRecord.temperatureOverLimit === 'boolean' && (
                    <p style={{ margin: '0 0 4px 0' }}>
                      <AuditOutlined /> <strong>温度超标：</strong>
                      <Tag color={selectedRecord.temperatureOverLimit ? 'error' : 'success'}>
                        {selectedRecord.temperatureOverLimit ? '是' : '否'}
                      </Tag>
                    </p>
                  )}
                  {selectedRecord.conclusion && (
                    <p style={{ margin: '4px 0 0 0' }}><strong>最终结论：</strong>{selectedRecord.conclusion}</p>
                  )}
                  {selectedRecord.abnormalRemark && (
                    <p style={{ margin: '4px 0 0 0' }}><strong>异常说明：</strong>{selectedRecord.abnormalRemark}</p>
                  )}
                </div>
              )}
            </div>
            <ReactECharts option={getTemperatureChartOption(selectedRecord.temperatureRecords, selectedRecord.vehicleNo)} style={{ height: '400px', width: '100%' }} notMerge lazyUpdate />
            <div style={{ marginTop: 16, fontSize: '12px', color: '#999' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span><Tag color="success">2-8℃</Tag> 正常温度范围</span>
                <span><Tag color="warning">3-2℃ 或 7-8℃</Tag> 温度预警</span>
                <span><Tag color="error">＜2℃ 或 ＞8℃</Tag> 超温报警</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
