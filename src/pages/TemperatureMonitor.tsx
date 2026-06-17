import { useState, useMemo } from 'react'
import {
  Tabs, Card, Row, Col, Table, Button, Form, Input, Select, Modal,
  Space, Tag, message, Tooltip, Radio, Typography, Progress
} from 'antd'
import {
  EnvironmentOutlined,
  LineChartOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  HomeOutlined,
  TruckOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import type { ColdStorage, TemperatureRecord, AlarmRecord, TransportRecord } from '@/types'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

type TabKey = 'monitor' | 'chart' | 'alarm'
type TimeRange = '24h' | '7d' | '30d'
type DeviceType = 'storage' | 'vehicle'

interface DeviceInfo {
  id: string
  name: string
  type: DeviceType
  targetTempMin: number
  targetTempMax: number
}

const getStatusColor = (status: ColdStorage['status']) => {
  switch (status) {
    case 'normal':
      return '#52c41a'
    case 'warning':
      return '#faad14'
    case 'alarm':
      return '#f5222d'
    default:
      return '#d9d9d9'
  }
}

const getStatusText = (status: ColdStorage['status']) => {
  switch (status) {
    case 'normal':
      return '正常'
    case 'warning':
      return '预警'
    case 'alarm':
      return '报警'
    default:
      return '未知'
  }
}

const getStatusTagColor = (status: ColdStorage['status']) => {
  switch (status) {
    case 'normal':
      return 'success'
    case 'warning':
      return 'warning'
    case 'alarm':
      return 'error'
    default:
      return 'default'
  }
}

const getAlarmTypeText = (type: AlarmRecord['alarmType']) => {
  switch (type) {
    case 'overTemp':
      return '超温'
    case 'underTemp':
      return '低温'
    case 'powerOff':
      return '断电'
    case 'deviceError':
      return '设备故障'
    default:
      return '未知'
  }
}

const getAlarmLevelColor = (level: AlarmRecord['alarmLevel']) => {
  return level === 'critical' ? 'red' : 'orange'
}

const getAlarmLevelText = (level: AlarmRecord['alarmLevel']) => {
  return level === 'critical' ? '严重' : '警告'
}

const getAlarmStatusText = (status: AlarmRecord['status']) => {
  switch (status) {
    case 'pending':
      return '待处理'
    case 'processing':
      return '处理中'
    case 'resolved':
      return '已解决'
    default:
      return '未知'
  }
}

const getAlarmStatusColor = (status: AlarmRecord['status']) => {
  switch (status) {
    case 'pending':
      return 'red'
    case 'processing':
      return 'orange'
    case 'resolved':
      return 'green'
    default:
      return 'default'
  }
}

export default function TemperatureMonitor() {
  const [activeTab, setActiveTab] = useState<TabKey>('monitor')
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyDevice, setHistoryDevice] = useState<ColdStorage | null>(null)
  const [handleModalOpen, setHandleModalOpen] = useState(false)
  const [handleForm] = Form.useForm()
  const [currentAlarm, setCurrentAlarm] = useState<AlarmRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  const { coldStorages, temperatureRecords, transportRecords, alarmRecords, updateAlarmRecord } = useAppStore()

  const allDevices: DeviceInfo[] = useMemo(() => {
    const storageDevices: DeviceInfo[] = coldStorages.map(s => ({
      id: s.id,
      name: s.name,
      type: 'storage' as DeviceType,
      targetTempMin: s.targetTempMin,
      targetTempMax: s.targetTempMax
    }))
    const vehicleDevices: DeviceInfo[] = transportRecords.map(t => ({
      id: t.id,
      name: t.vehicleNo,
      type: 'vehicle' as DeviceType,
      targetTempMin: 2,
      targetTempMax: 8
    }))
    return [...storageDevices, ...vehicleDevices]
  }, [coldStorages, transportRecords])

  const activeDevice = selectedDevice || allDevices[0]

  const getHoursFromTimeRange = (range: TimeRange): number => {
    switch (range) {
      case '24h': return 24
      case '7d': return 168
      case '30d': return 720
      default: return 24
    }
  }

  const deviceTemperatureRecords = useMemo(() => {
    if (!activeDevice) return []
    const hours = getHoursFromTimeRange(timeRange)
    const startTime = dayjs().subtract(hours, 'hour')

    if (activeDevice.type === 'storage') {
      return temperatureRecords
        .filter(r => r.deviceId === activeDevice.id)
        .filter(r => dayjs(r.recordTime).isAfter(startTime))
        .sort((a, b) => dayjs(a.recordTime).valueOf() - dayjs(b.recordTime).valueOf())
    } else {
      const transport = transportRecords.find(t => t.id === activeDevice.id)
      return transport?.temperatureRecords
        .filter(r => dayjs(r.recordTime).isAfter(startTime))
        .sort((a, b) => dayjs(a.recordTime).valueOf() - dayjs(b.recordTime).valueOf()) || []
    }
  }, [activeDevice, timeRange, temperatureRecords, transportRecords])

  const chartOption = useMemo(() => {
    const records = deviceTemperatureRecords
    const times = records.map(r => r.recordTime)
    const temps = records.map(r => r.temperature)
    const alarmPoints = records
      .map((r, idx) => r.status === 'alarm' ? { value: [times[idx], r.temperature] } : null)
      .filter(Boolean)

    const tempMin = activeDevice?.targetTempMin || 2
    const tempMax = activeDevice?.targetTempMax || 8

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0]
          return `${data.name}<br/>温度: ${data.value}℃`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLabel: {
          rotate: timeRange === '24h' ? 0 : 30,
          fontSize: 11,
          formatter: (value: string) => {
            if (timeRange === '24h') {
              return dayjs(value).format('HH:mm')
            } else {
              return dayjs(value).format('MM-DD HH:mm')
            }
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '温度(℃)',
        nameTextStyle: {
          padding: [0, 40, 0, 0]
        },
        min: (value: any) => Math.floor(value.min - 2),
        max: (value: any) => Math.ceil(value.max + 2)
      },
      visualMap: {
        show: false,
        pieces: [
          { lte: tempMin, color: '#1890ff' },
          { gt: tempMin, lt: tempMax, color: '#52c41a' },
          { gte: tempMax, color: '#f5222d' }
        ]
      },
      series: [
        {
          name: '温度',
          type: 'line',
          data: temps,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2
          },
          markArea: {
            silent: true,
            data: [
              [
                {
                  yAxis: tempMin,
                  itemStyle: {
                    color: 'rgba(82, 196, 26, 0.1)'
                  }
                },
                {
                  yAxis: tempMax
                }
              ]
            ]
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              type: 'dashed',
              color: '#faad14'
            },
            data: [
              { yAxis: tempMin, label: { formatter: `${tempMin}℃`, position: 'end' } },
              { yAxis: tempMax, label: { formatter: `${tempMax}℃`, position: 'end' } }
            ]
          }
        },
        {
          name: '超温点',
          type: 'scatter',
          data: alarmPoints,
          symbol: 'circle',
          symbolSize: 12,
          itemStyle: {
            color: '#f5222d',
            borderWidth: 2,
            borderColor: '#fff'
          },
          tooltip: {
            formatter: (params: any) => {
              return `${params.name}<br/>超温: ${params.value[1]}℃`
            }
          }
        }
      ]
    }
  }, [deviceTemperatureRecords, activeDevice, timeRange])

  const historyChartOption = useMemo(() => {
    if (!historyDevice) return {}
    const records = temperatureRecords
      .filter(r => r.deviceId === historyDevice.id)
      .sort((a, b) => dayjs(a.recordTime).valueOf() - dayjs(b.recordTime).valueOf())

    const times = records.map(r => r.recordTime)
    const temps = records.map(r => r.temperature)
    const alarmPoints = records
      .map((r, idx) => r.status === 'alarm' ? { value: [times[idx], r.temperature] } : null)
      .filter(Boolean)

    return {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLabel: {
          rotate: 30,
          fontSize: 11,
          formatter: (value: string) => dayjs(value).format('MM-DD HH:mm')
        }
      },
      yAxis: {
        type: 'value',
        name: '温度(℃)'
      },
      series: [
        {
          name: '温度',
          type: 'line',
          data: temps,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: {
            width: 2,
            color: '#1890ff'
          },
          itemStyle: {
            color: '#1890ff'
          },
          markArea: {
            silent: true,
            data: [
              [
                { yAxis: historyDevice.targetTempMin, itemStyle: { color: 'rgba(82, 196, 26, 0.1)' } },
                { yAxis: historyDevice.targetTempMax }
              ]
            ]
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#faad14' },
            data: [
              { yAxis: historyDevice.targetTempMin, label: { formatter: `${historyDevice.targetTempMin}℃`, position: 'end' } },
              { yAxis: historyDevice.targetTempMax, label: { formatter: `${historyDevice.targetTempMax}℃`, position: 'end' } }
            ]
          }
        },
        {
          name: '超温点',
          type: 'scatter',
          data: alarmPoints,
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: { color: '#f5222d', borderWidth: 2, borderColor: '#fff' }
        }
      ]
    }
  }, [historyDevice, temperatureRecords])

  const filteredAlarms = useMemo(() => {
    return alarmRecords
      .filter(a => statusFilter === 'all' || a.status === statusFilter)
      .filter(a => levelFilter === 'all' || a.alarmLevel === levelFilter)
      .filter(a => deviceTypeFilter === 'all' || a.deviceType === deviceTypeFilter)
      .filter(a => !searchText || 
        a.deviceName.includes(searchText) || 
        a.alarmType.includes(searchText)
      )
      .sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf())
  }, [alarmRecords, statusFilter, levelFilter, deviceTypeFilter, searchText])

  const handleCardClick = (storage: ColdStorage) => {
    setHistoryDevice(storage)
    setHistoryModalOpen(true)
  }

  const handleProcessClick = (alarm: AlarmRecord) => {
    setCurrentAlarm(alarm)
    handleForm.setFieldsValue({
      handler: alarm.handler || '',
      handleMethod: alarm.handleMethod || ''
    })
    setHandleModalOpen(true)
  }

  const handleResolveSubmit = async () => {
    try {
      const values = await handleForm.validateFields()
      if (!currentAlarm) return

      updateAlarmRecord(currentAlarm.id, {
        status: 'resolved',
        handler: values.handler,
        handleMethod: values.handleMethod,
        handleTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        endTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      })

      message.success('报警处理成功')
      setHandleModalOpen(false)
      handleForm.resetFields()
    } catch (error) {
      console.error('处理失败:', error)
    }
  }

  const alarmColumns: ColumnsType<AlarmRecord> = [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 120,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100,
      render: (type) => (
        <Tag icon={type.includes('车') ? <TruckOutlined /> : <HomeOutlined />}>
          {type}
        </Tag>
      )
    },
    {
      title: '报警类型',
      dataIndex: 'alarmType',
      key: 'alarmType',
      width: 100,
      render: (type) => getAlarmTypeText(type)
    },
    {
      title: '级别',
      dataIndex: 'alarmLevel',
      key: 'alarmLevel',
      width: 80,
      render: (level) => (
        <Tag color={getAlarmLevelColor(level)} icon={<ExclamationCircleOutlined />}>
          {getAlarmLevelText(level)}
        </Tag>
      )
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getAlarmStatusColor(status)}>
          {getAlarmStatusText(status)}
        </Tag>
      )
    },
    {
      title: '处理人',
      dataIndex: 'handler',
      key: 'handler',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: '报警详情',
                  content: (
                    <div style={{ lineHeight: 2 }}>
                      <p><strong>设备名称：</strong>{record.deviceName}</p>
                      <p><strong>设备类型：</strong>{record.deviceType}</p>
                      <p><strong>报警类型：</strong>{getAlarmTypeText(record.alarmType)}</p>
                      <p><strong>报警级别：</strong>{getAlarmLevelText(record.alarmLevel)}</p>
                      <p><strong>报警温度：</strong>{record.temperature}℃</p>
                      <p><strong>开始时间：</strong>{record.startTime}</p>
                      <p><strong>结束时间：</strong>{record.endTime || '-'}</p>
                      <p><strong>状态：</strong>{getAlarmStatusText(record.status)}</p>
                      <p><strong>处理人：</strong>{record.handler || '-'}</p>
                      <p><strong>处理措施：</strong>{record.handleMethod || '-'}</p>
                      <p><strong>处理时间：</strong>{record.handleTime || '-'}</p>
                    </div>
                  ),
                  width: 500
                })
              }}
            >
              详情
            </Button>
          </Tooltip>
          {record.status !== 'resolved' && (
            <Tooltip title="处理报警">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleProcessClick(record)}
              >
                处理
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  const monitorTab = (
    <div>
      <Title level={5} style={{ marginBottom: '16px' }}>冷库/冷藏柜实时温度监控</Title>
      <Row gutter={[16, 16]}>
        {coldStorages.map((storage) => (
          <Col xs={24} sm={12} md={8} lg={8} xl={8} key={storage.id}>
            <Card
              hoverable
              style={{
                borderRadius: '8px',
                borderLeft: `4px solid ${getStatusColor(storage.status)}`,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              bodyStyle={{ padding: '16px' }}
              onClick={() => handleCardClick(storage)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    {storage.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center' }}>
                    <EnvironmentOutlined style={{ marginRight: '4px' }} />
                    {storage.location}
                  </div>
                </div>
                <Tag color={getStatusTagColor(storage.status)}>
                  {getStatusText(storage.status)}
                </Tag>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <span style={{ 
                  fontSize: '36px', 
                  fontWeight: 700, 
                  color: getStatusColor(storage.status) 
                }}>
                  {storage.currentTemp}
                </span>
                <span style={{ fontSize: '16px', color: '#666' }}>℃</span>
              </div>

              <Progress
                percent={Math.min(100, Math.max(0, 
                  ((storage.currentTemp - storage.targetTempMin) / 
                   (storage.targetTempMax - storage.targetTempMin)) * 100
                ))}
                showInfo={false}
                strokeColor={getStatusColor(storage.status)}
                style={{ marginBottom: '8px' }}
              />

              <div style={{ fontSize: '12px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                <span>温度范围: {storage.targetTempMin}~{storage.targetTempMax}℃</span>
                <span>容量: {storage.capacity.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span><ClockCircleOutlined /> 更新: {dayjs(storage.lastUpdate).format('HH:mm:ss')}</span>
                <span style={{ color: '#1890ff' }}>点击查看历史 <EyeOutlined /></span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )

  const chartTab = (
    <div>
      <Title level={5} style={{ marginBottom: '16px' }}>全程温度曲线监控</Title>
      <div style={{ display: 'flex', gap: '16px', height: '500px' }}>
        <div style={{ 
          width: '240px', 
          background: '#fff', 
          borderRadius: '8px', 
          padding: '12px',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>
            设备列表
          </div>
          
          <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px' }}>
            <HomeOutlined /> 冷库/冷藏柜
          </div>
          {coldStorages.map(storage => (
            <div
              key={storage.id}
              onClick={() => setSelectedDevice({
                id: storage.id,
                name: storage.name,
                type: 'storage',
                targetTempMin: storage.targetTempMin,
                targetTempMax: storage.targetTempMax
              })}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeDevice?.id === storage.id ? '#e6f7ff' : 'transparent',
                borderLeft: `3px solid ${activeDevice?.id === storage.id ? '#1890ff' : 'transparent'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '13px' }}>{storage.name}</span>
              <Tag color={getStatusTagColor(storage.status)} style={{ margin: 0 }}>
                {storage.currentTemp}℃
              </Tag>
            </div>
          ))}

          <div style={{ margin: '16px 0 8px', color: '#666', fontSize: '12px' }}>
            <TruckOutlined /> 冷藏车
          </div>
          {transportRecords.map(transport => (
            <div
              key={transport.id}
              onClick={() => setSelectedDevice({
                id: transport.id,
                name: transport.vehicleNo,
                type: 'vehicle',
                targetTempMin: 2,
                targetTempMax: 8
              })}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeDevice?.id === transport.id ? '#e6f7ff' : 'transparent',
                borderLeft: `3px solid ${activeDevice?.id === transport.id ? '#1890ff' : 'transparent'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '13px' }}>{transport.vehicleNo}</span>
              <Tag color={
                transport.status === 'transporting' ? 'processing' :
                transport.status === 'completed' ? 'success' : 'warning'
              } style={{ margin: 0 }}>
                {transport.status === 'transporting' ? '在途' :
                 transport.status === 'completed' ? '已完成' : '异常'}
              </Tag>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>{activeDevice?.name}</span>
              <span style={{ marginLeft: '12px', color: '#666', fontSize: '13px' }}>
                温度范围: {activeDevice?.targetTempMin}~{activeDevice?.targetTempMax}℃
              </span>
            </div>
            <Radio.Group value={timeRange} onChange={(e) => setTimeRange(e.target.value)} size="small">
              <Radio.Button value="24h">最近24小时</Radio.Button>
              <Radio.Button value="7d">最近7天</Radio.Button>
              <Radio.Button value="30d">最近30天</Radio.Button>
            </Radio.Group>
          </div>
          <ReactECharts
            option={chartOption}
            style={{ height: '400px', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </div>
    </div>
  )

  const alarmTab = (
    <div>
      <Title level={5} style={{ marginBottom: '16px' }}>超温报警处置</Title>
      
      <Card style={{ borderRadius: '8px', marginBottom: '16px' }} bodyStyle={{ padding: '16px' }}>
        <Space wrap size="middle">
          <Input
            placeholder="搜索设备名称、报警类型"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="按状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 130 }}
            allowClear
          >
            <Option value="all">全部状态</Option>
            <Option value="pending">待处理</Option>
            <Option value="processing">处理中</Option>
            <Option value="resolved">已解决</Option>
          </Select>
          <Select
            placeholder="按级别筛选"
            value={levelFilter}
            onChange={setLevelFilter}
            style={{ width: 130 }}
            allowClear
          >
            <Option value="all">全部级别</Option>
            <Option value="warning">警告</Option>
            <Option value="critical">严重</Option>
          </Select>
          <Select
            placeholder="按设备类型筛选"
            value={deviceTypeFilter}
            onChange={setDeviceTypeFilter}
            style={{ width: 130 }}
            allowClear
          >
            <Option value="all">全部类型</Option>
            <Option value="冷库">冷库</Option>
            <Option value="冷藏柜">冷藏柜</Option>
            <Option value="冷藏车">冷藏车</Option>
          </Select>
          <Button
            onClick={() => {
              setSearchText('')
              setStatusFilter('all')
              setLevelFilter('all')
              setDeviceTypeFilter('all')
            }}
          >
            重置筛选
          </Button>
        </Space>
      </Card>

      <Table
        columns={alarmColumns}
        dataSource={filteredAlarms}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条报警记录`,
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  )

  const tabItems = [
    {
      key: 'monitor',
      label: (
        <Space>
          <EnvironmentOutlined />
          冷库温度监控
        </Space>
      ),
      children: monitorTab
    },
    {
      key: 'chart',
      label: (
        <Space>
          <LineChartOutlined />
          全程温度曲线
        </Space>
      ),
      children: chartTab
    },
    {
      key: 'alarm',
      label: (
        <Space>
          <WarningOutlined />
          超温报警处置
          {alarmRecords.filter(a => a.status === 'pending').length > 0 && (
            <Tag color="red" style={{ marginLeft: 0 }}>
              {alarmRecords.filter(a => a.status === 'pending').length}
            </Tag>
          )}
        </Space>
      ),
      children: alarmTab
    }
  ]

  return (
    <div style={{ padding: '0' }}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={tabItems}
      />

      <Modal
        title={`${historyDevice?.name} - 历史温度曲线`}
        open={historyModalOpen}
        onCancel={() => {
          setHistoryModalOpen(false)
          setHistoryDevice(null)
        }}
        footer={[
          <Button key="close" onClick={() => setHistoryModalOpen(false)}>
            关闭
          </Button>
        ]}
        width={900}
      >
        {historyDevice && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Space wrap>
                <span><strong>位置：</strong>{historyDevice.location}</span>
                <span><strong>温度范围：</strong>{historyDevice.targetTempMin}~{historyDevice.targetTempMax}℃</span>
                <span><strong>当前温度：</strong>
                  <span style={{ color: getStatusColor(historyDevice.status), fontWeight: 600 }}>
                    {historyDevice.currentTemp}℃
                  </span>
                </span>
                <span><strong>状态：</strong>
                  <Tag color={getStatusTagColor(historyDevice.status)}>
                    {getStatusText(historyDevice.status)}
                  </Tag>
                </span>
              </Space>
            </div>
            <ReactECharts
              option={historyChartOption}
              style={{ height: '350px', width: '100%' }}
              notMerge={true}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="处理报警"
        open={handleModalOpen}
        onOk={handleResolveSubmit}
        onCancel={() => {
          setHandleModalOpen(false)
          setCurrentAlarm(null)
          handleForm.resetFields()
        }}
        width={550}
        okText="标记为已解决"
        cancelText="取消"
      >
        {currentAlarm && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#fff7e6', borderRadius: '4px' }}>
            <Space wrap>
              <span><strong>设备：</strong>{currentAlarm.deviceName}</span>
              <span><strong>类型：</strong>{getAlarmTypeText(currentAlarm.alarmType)}</span>
              <span><strong>级别：</strong>
                <Tag color={getAlarmLevelColor(currentAlarm.alarmLevel)}>
                  {getAlarmLevelText(currentAlarm.alarmLevel)}
                </Tag>
              </span>
              <span><strong>温度：</strong>{currentAlarm.temperature}℃</span>
            </Space>
          </div>
        )}
        <Form
          form={handleForm}
          layout="vertical"
        >
          <Form.Item
            name="handler"
            label="处理人"
            rules={[{ required: true, message: '请选择处理人' }]}
          >
            <Select placeholder="请选择处理人">
              <Option value="赵工程师">赵工程师</Option>
              <Option value="李师傅">李师傅</Option>
              <Option value="王医生">王医生</Option>
              <Option value="张医生">张医生</Option>
              <Option value="刘主任">刘主任</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="handleMethod"
            label="处理措施"
            rules={[{ required: true, message: '请填写处理措施' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细描述处理措施，如：检修制冷系统、启动备用设备、转移疫苗等"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
