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
  DashboardOutlined, HistoryOutlined, CarOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import { generateTempRecords } from '@/mock/data'
import type { TransportRecord, TemperatureRecord, VaccineBatch } from '@/types'

const { Option } = Select
const { TextArea } = Input
const { RangePicker } = DatePicker
const { Title, Text } = Typography

type TabKey = 'register' | 'monitor' | 'history'

const getStatusColor = (status: TransportRecord['status']) => {
  switch (status) {
    case 'transporting':
      return 'processing'
    case 'completed':
      return 'success'
    case 'abnormal':
      return 'error'
    default:
      return 'default'
  }
}

const getStatusText = (status: TransportRecord['status']) => {
  switch (status) {
    case 'transporting':
      return '运输中'
    case 'completed':
      return '已完成'
    case 'abnormal':
      return '异常'
    default:
      return '未知'
  }
}

const getStatusIcon = (status: TransportRecord['status']) => {
  switch (status) {
    case 'transporting':
      return <TruckOutlined />
    case 'completed':
      return <CheckCircleOutlined />
    case 'abnormal':
      return <ExclamationCircleOutlined />
    default:
      return null
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
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

const getCurrentTemp = (records: TemperatureRecord[]) => {
  if (records.length === 0) return null
  return records[records.length - 1].temperature
}

const getTemperatureChartOption = (records: TemperatureRecord[], vehicleNo: string) => {
  const times = records.map(r => dayjs(r.recordTime).format('MM-DD HH:mm'))
  const temps = records.map(r => r.temperature)

  return {
    title: {
      text: `${vehicleNo} 温度监控曲线`,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        const temp = data.value
        let status = '正常'
        if (temp < 2 || temp > 8) status = '超温报警'
        else if (temp < 3 || temp > 7) status = '温度预警'
        return `${data.name}<br/>温度: ${temp}℃<br/>状态: ${status}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: {
        rotate: 30,
        fontSize: 10,
        interval: Math.floor(times.length / 8)
      }
    },
    yAxis: {
      type: 'value',
      name: '温度(℃)',
      min: 0,
      max: 12,
      axisLabel: {
        formatter: '{value}℃'
      }
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
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ]
          }
        },
        markArea: {
          silent: true,
          data: [
            [
              {
                yAxis: 2,
                itemStyle: {
                  color: 'rgba(82, 196, 26, 0.1)'
                }
              },
              {
                yAxis: 8
              }
            ]
          ]
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: 2,
              lineStyle: {
                color: '#52c41a',
                type: 'dashed',
                width: 1
              },
              label: {
                formatter: '下限 2℃',
                position: 'start',
                fontSize: 10,
                color: '#52c41a'
              }
            },
            {
              yAxis: 8,
              lineStyle: {
                color: '#52c41a',
                type: 'dashed',
                width: 1
              },
              label: {
                formatter: '上限 8℃',
                position: 'start',
                fontSize: 10,
                color: '#52c41a'
              }
            }
          ]
        }
      }
    ]
  }
}

export default function ColdChainTransport() {
  const [activeTab, setActiveTab] = useState<TabKey>('register')
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [tempChartModalOpen, setTempChartModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<TransportRecord | null>(null)
  const [registerForm] = Form.useForm()
  const [registerSearch, setRegisterSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const { transportRecords, vaccineBatches, addTransportRecord, temperatureRecords, addTemperatureRecord } = useAppStore()

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
        return {
          batchId,
          vaccineName: batch?.vaccineName || '',
          batchNo: batch?.batchNo || '',
          quantity
        }
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
        endLocation: values.endLocation,
        status: 'transporting',
        vaccines: selectedVaccines,
        temperatureRecords: newTempRecords
      }

      addTransportRecord(record)

      newTempRecords.forEach(tr => {
        addTemperatureRecord(tr)
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

  const handleCompleteTransport = (record: TransportRecord) => {
    Modal.confirm({
      title: '确认完成运输',
      content: `确定要完成车牌号 ${record.vehicleNo} 的运输任务吗？`,
      onOk: () => {
        const { updateTransportRecord } = useAppStore.getState()
        updateTransportRecord(record.id, {
          status: 'completed',
          endTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
        })
        message.success('运输已完成')
      }
    })
  }

  const handleAbnormalTransport = (record: TransportRecord) => {
    Modal.confirm({
      title: '标记运输异常',
      content: `确定要将车牌号 ${record.vehicleNo} 标记为异常吗？`,
      okText: '确认异常',
      okType: 'danger',
      onOk: () => {
        const { updateTransportRecord } = useAppStore.getState()
        updateTransportRecord(record.id, {
          status: 'abnormal',
          endTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
        })
        message.success('已标记为异常')
      }
    })
  }

  const viewRecordDetail = (record: TransportRecord) => {
    Modal.info({
      title: '运输详情',
      width: 600,
      content: (
        <div style={{ lineHeight: 2 }}>
          <p><strong>车牌号：</strong>{record.vehicleNo}</p>
          <p><strong>司机：</strong>{record.driver}</p>
          <p><strong>出发时间：</strong>{record.startTime}</p>
          <p><strong>到达时间：</strong>{record.endTime || '-'}</p>
          <p><strong>运输时长：</strong>{getDuration(record.startTime, record.endTime)}</p>
          <p><strong>出发地：</strong>{record.startLocation}</p>
          <p><strong>目的地：</strong>{record.endLocation}</p>
          <p><strong>状态：</strong>
            <Tag color={getStatusColor(record.status)} icon={getStatusIcon(record.status)}>
              {getStatusText(record.status)}
            </Tag>
          </p>
          <p><strong>运输疫苗：</strong></p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {record.vaccines.map((v, idx) => (
              <li key={idx}>
                {v.vaccineName}（批号：{v.batchNo}，数量：{v.quantity}支）
              </li>
            ))}
          </ul>
          {record.temperatureRecords.length > 0 && (
            <p style={{ marginTop: 8 }}>
              <strong>当前温度：</strong>
              <span style={{ color: getTempStatusColor(getCurrentTemp(record.temperatureRecords) || 0), fontWeight: 600 }}>
                {getCurrentTemp(record.temperatureRecords)}℃
              </span>
            </p>
          )}
        </div>
      )
    })
  }

  const registerColumns = [
    {
      title: '车牌号',
      dataIndex: 'vehicleNo',
      key: 'vehicleNo',
      width: 120,
    },
    {
      title: '司机',
      dataIndex: 'driver',
      key: 'driver',
      width: 100,
    },
    {
      title: '出发时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
    },
    {
      title: '出发地',
      dataIndex: 'startLocation',
      key: 'startLocation',
      width: 150,
    },
    {
      title: '目的地',
      dataIndex: 'endLocation',
      key: 'endLocation',
      width: 150,
    },
    {
      title: '运输疫苗',
      key: 'vaccines',
      width: 200,
      render: (_, record: TransportRecord) => (
        <Tooltip title={record.vaccines.map(v => `${v.vaccineName} (${v.batchNo}) x${v.quantity}`).join('\n')}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {record.vaccines.map(v => v.vaccineName).join('、')}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TransportRecord['status']) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record: TransportRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewRecordDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DashboardOutlined />}
            onClick={() => handleViewTempChart(record)}
          >
            温度曲线
          </Button>
          {record.status === 'transporting' && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => handleCompleteTransport(record)}
                style={{ color: '#52c41a' }}
              >
                完成
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => handleAbnormalTransport(record)}
              >
                异常
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  const historyColumns = [
    ...registerColumns,
    {
      title: '到达时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 160,
      render: (val?: string) => val || '-',
    },
  ]

  const tabItems = [
    {
      key: 'register',
      label: (
        <Space>
          <CarOutlined />
          冷藏车运输登记
        </Space>
      ),
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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setRegisterModalOpen(true)}
            >
              新增运输登记
            </Button>
          </div>
          <Table
            columns={registerColumns}
            dataSource={registerRecords}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1150 }}
          />
        </div>
      ),
    },
    {
      key: 'monitor',
      label: (
        <Space>
          <DashboardOutlined />
          在途运输监控
          {transportingRecords.length > 0 && (
            <Tag color="processing" style={{ marginLeft: 4 }}>
              {transportingRecords.length}
            </Tag>
          )}
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
                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={record.id}>
                    <Card
                      hoverable
                      onClick={() => handleViewTempChart(record)}
                      style={{
                        borderRadius: '8px',
                        border: `1px solid ${currentTemp && (currentTemp < 2 || currentTemp > 8) ? '#ff4d4f' : '#d9d9d9'}`,
                        cursor: 'pointer'
                      }}
                      bodyStyle={{ padding: '16px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                            {record.vehicleNo}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center' }}>
                            <UserOutlined style={{ marginRight: 4 }} />
                            {record.driver}
                          </div>
                        </div>
                        <Tag color="processing" icon={<TruckOutlined />}>
                          运输中
                        </Tag>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                        <span
                          style={{
                            fontSize: '36px',
                            fontWeight: 700,
                            color: currentTemp ? getTempStatusColor(currentTemp) : '#999'
                          }}
                        >
                          {currentTemp !== null ? currentTemp : '-'}
                        </span>
                        <span style={{ fontSize: '18px', color: '#666' }}>℃</span>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <Statistic
                          title={
                            <span style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center' }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              运输时长
                            </span>
                          }
                          value={getDuration(record.startTime)}
                          valueStyle={{ fontSize: '14px', fontWeight: 500 }}
                        />
                      </div>

                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        <EnvironmentOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                        {record.startLocation} → {record.endLocation}
                      </div>

                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                          运输疫苗：
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {record.vaccines.slice(0, 2).map((v, idx) => (
                            <Tag key={idx} size="small" color="blue">
                              {v.vaccineName}
                            </Tag>
                          ))}
                          {record.vaccines.length > 2 && (
                            <Tag size="small">+{record.vaccines.length - 2}</Tag>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <Button type="primary" size="small" icon={<DashboardOutlined />}>
                          查看温度曲线
                        </Button>
                      </div>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <Space>
          <HistoryOutlined />
          运输历史记录
        </Space>
      ),
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
            <Button
              onClick={() => {
                setHistorySearch('')
                setStatusFilter('')
                setDateRange(null)
              }}
            >
              重置
            </Button>
          </div>
          <Table
            columns={historyColumns}
            dataSource={historyRecords}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1300 }}
          />
        </div>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: '20px' }}>
        <TruckOutlined style={{ marginRight: 8 }} />
        冷链运输管理
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={tabItems}
      />

      <Modal
        title="新增运输登记"
        open={registerModalOpen}
        onOk={handleRegisterSubmit}
        onCancel={() => {
          setRegisterModalOpen(false)
          registerForm.resetFields()
        }}
        width={700}
        okText="确认登记"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={registerForm}
          layout="vertical"
          initialValues={{
            startLocation: '市疾控中心',
            selectedBatches: []
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="vehicleNo"
              label="车牌号"
              rules={[{ required: true, message: '请输入车牌号' }]}
            >
              <Input placeholder="请输入车牌号，如：京A·12345" />
            </Form.Item>
            <Form.Item
              name="driver"
              label="司机"
              rules={[{ required: true, message: '请输入司机姓名' }]}
            >
              <Input placeholder="请输入司机姓名" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="startLocation"
              label="出发地"
              rules={[{ required: true, message: '请输入出发地' }]}
            >
              <Input placeholder="请输入出发地" />
            </Form.Item>
            <Form.Item
              name="endLocation"
              label="目的地"
              rules={[{ required: true, message: '请输入目的地' }]}
            >
              <Select
                placeholder="请选择或输入目的地"
                mode="tags"
                maxTagCount={1}
                allowClear
              >
                <Option value="朝阳区第一社区卫生服务中心">朝阳区第一社区卫生服务中心</Option>
                <Option value="海淀区中关村医院">海淀区中关村医院</Option>
                <Option value="西城区接种中心">西城区接种中心</Option>
                <Option value="东城区第一人民医院">东城区第一人民医院</Option>
                <Option value="丰台区妇幼保健院">丰台区妇幼保健院</Option>
                <Option value="北京市疾控中心接种门诊">北京市疾控中心接种门诊</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="selectedBatches"
            label="选择运输疫苗（可多选批次）"
            rules={[{ required: true, message: '请选择至少一个疫苗批次' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择疫苗批次"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
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
                  <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: 12 }}>
                    填写运输数量：
                  </div>
                  {selectedBatches.map(batchId => {
                    const batch = vaccineBatches.find(b => b.id === batchId)
                    if (!batch) return null
                    return (
                      <div key={batchId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {batch.vaccineName} ({batch.batchNo})
                        </div>
                        <Form.Item
                          name={`quantity_${batchId}`}
                          style={{ marginBottom: 0 }}
                          rules={[{ required: true, message: '请输入数量' }]}
                        >
                          <InputNumber
                            min={1}
                            max={batch.quantity}
                            style={{ width: '100%' }}
                            placeholder={`库存${batch.quantity}${batch.unit}`}
                          />
                        </Form.Item>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          单位：{batch.unit}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }}
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea
              rows={2}
              placeholder="请输入备注信息"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="温度监控曲线"
        open={tempChartModalOpen}
        onCancel={() => {
          setTempChartModalOpen(false)
          setSelectedRecord(null)
        }}
        footer={null}
        width={900}
        destroyOnClose
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <Row gutter={24}>
                <Col span={6}>
                  <Statistic
                    title="车牌号"
                    value={selectedRecord.vehicleNo}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="司机"
                    value={selectedRecord.driver}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="运输时长"
                    value={getDuration(selectedRecord.startTime, selectedRecord.endTime)}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="当前温度"
                    value={getCurrentTemp(selectedRecord.temperatureRecords)}
                    suffix="℃"
                    valueStyle={{
                      fontSize: '16px',
                      color: getTempStatusColor(getCurrentTemp(selectedRecord.temperatureRecords) || 0)
                    }}
                  />
                </Col>
              </Row>
            </div>
            <ReactECharts
              option={getTemperatureChartOption(selectedRecord.temperatureRecords, selectedRecord.vehicleNo)}
              style={{ height: '400px', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
            />
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
