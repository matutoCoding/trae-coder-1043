import { useState, useMemo } from 'react'
import {
  Tabs, Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, Tag, message, Card, Row, Col, Statistic, InputNumber
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EyeOutlined,
  WarningOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import type { VaccineBatch, DestroyRecord, ChainBreakEvent } from '@/types'

const { Option } = Select
const { TextArea } = Input

const batchStatusMap: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'green' },
  nearExpire: { text: '近效期', color: 'orange' },
  expired: { text: '已过期', color: 'red' },
  destroyed: { text: '已销毁', color: 'default' }
}

const eventTypeMap: Record<string, { text: string; color: string }> = {
  temperature: { text: '温度异常', color: 'red' },
  transport: { text: '运输异常', color: 'orange' },
  storage: { text: '存储异常', color: 'gold' },
  other: { text: '其他', color: 'default' }
}

const eventStatusMap: Record<string, { text: string; color: string }> = {
  investigating: { text: '调查中', color: 'blue' },
  processing: { text: '处理中', color: 'orange' },
  closed: { text: '已关闭', color: 'green' }
}

const destroyMethodOptions = ['高温灭菌后填埋', '高压蒸汽灭菌', '化学消毒处理', '焚烧处理', '其他']

const getRemainingDays = (expireDate: string): number => {
  return dayjs(expireDate).endOf('day').diff(dayjs().startOf('day'), 'day')
}

const getDayColor = (days: number): string => {
  if (days <= 0) return '#ff4d4f'
  if (days <= 30) return '#ff4d4f'
  if (days <= 60) return '#fa8c16'
  if (days <= 90) return '#fadb14'
  return '#52c41a'
}

const getDayStatus = (days: number): 'nearExpire' | 'expired' | 'normal' => {
  if (days <= 0) return 'expired'
  if (days <= 90) return 'nearExpire'
  return 'normal'
}

export default function ExpiryWarning() {
  const {
    vaccineBatches, destroyRecords, chainBreakEvents,
    addDestroyRecord, updateVaccineBatch,
    addChainBreakEvent, updateChainBreakEvent
  } = useAppStore()

  const [activeTab, setActiveTab] = useState('nearExpire')
  const [destroyModalVisible, setDestroyModalVisible] = useState(false)
  const [eventModalVisible, setEventModalVisible] = useState(false)
  const [handleEventModalVisible, setHandleEventModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [destroyForm] = Form.useForm()
  const [eventForm] = Form.useForm()
  const [handleEventForm] = Form.useForm()
  const [selectedBatch, setSelectedBatch] = useState<VaccineBatch | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ChainBreakEvent | null>(null)
  const [selectedDestroyRecord, setSelectedDestroyRecord] = useState<DestroyRecord | null>(null)
  const [detailType, setDetailType] = useState<'batch' | 'destroy' | 'event'>('batch')

  const [nearExpireFilters, setNearExpireFilters] = useState({
    vaccineName: '',
    batchNo: '',
    dayRange: ''
  })

  const [destroyFilters, setDestroyFilters] = useState({
    vaccineName: '',
    batchNo: '',
    destroyMethod: ''
  })

  const [eventFilters, setEventFilters] = useState({
    eventType: '',
    status: '',
    location: ''
  })

  const warningStats = useMemo(() => {
    const now = dayjs()
    let nearExpireCount = 0
    let expiredCount = 0
    let within30Days = 0
    let within60Days = 0
    let within90Days = 0

    vaccineBatches.forEach(batch => {
      if (batch.status === 'destroyed') return
      const days = getRemainingDays(batch.expireDate)
      if (days <= 0) {
        expiredCount++
      } else if (days <= 90) {
        nearExpireCount++
      }
      if (days > 0 && days <= 30) within30Days++
      if (days > 0 && days <= 60) within60Days++
      if (days > 0 && days <= 90) within90Days++
    })

    return { nearExpireCount, expiredCount, within30Days, within60Days, within90Days }
  }, [vaccineBatches])

  const filteredNearExpireBatches = useMemo(() => {
    return vaccineBatches.filter(batch => {
      if (batch.status === 'destroyed') return false
      const days = getRemainingDays(batch.expireDate)
      if (days > 90 && days > 0) return false

      if (nearExpireFilters.vaccineName && !batch.vaccineName.includes(nearExpireFilters.vaccineName)) return false
      if (nearExpireFilters.batchNo && !batch.batchNo.includes(nearExpireFilters.batchNo)) return false

      if (nearExpireFilters.dayRange) {
        const range = parseInt(nearExpireFilters.dayRange)
        if (range === 30 && days > 30) return false
        if (range === 60 && days > 60) return false
        if (range === 90 && days > 90) return false
      }

      return true
    })
  }, [vaccineBatches, nearExpireFilters])

  const filteredDestroyRecords = useMemo(() => {
    return destroyRecords.filter(record => {
      if (destroyFilters.vaccineName && !record.vaccineName.includes(destroyFilters.vaccineName)) return false
      if (destroyFilters.batchNo && !record.batchNo.includes(destroyFilters.batchNo)) return false
      if (destroyFilters.destroyMethod && record.destroyMethod !== destroyFilters.destroyMethod) return false
      return true
    })
  }, [destroyRecords, destroyFilters])

  const filteredEvents = useMemo(() => {
    return chainBreakEvents.filter(event => {
      if (eventFilters.eventType && event.eventType !== eventFilters.eventType) return false
      if (eventFilters.status && event.status !== eventFilters.status) return false
      if (eventFilters.location && !event.location.includes(eventFilters.location)) return false
      return true
    })
  }, [chainBreakEvents, eventFilters])

  const expiredBatches = useMemo(() => {
    return vaccineBatches.filter(batch => {
      if (batch.status === 'destroyed') return false
      const days = getRemainingDays(batch.expireDate)
      return days <= 0
    })
  }, [vaccineBatches])

  const handleOpenDestroyModal = (batch?: VaccineBatch) => {
    setSelectedBatch(batch || null)
    if (batch) {
      destroyForm.setFieldsValue({
        batchId: batch.id,
        vaccineName: batch.vaccineName,
        batchNo: batch.batchNo,
        quantity: batch.quantity,
        reason: '超过有效期'
      })
    } else {
      destroyForm.resetFields()
    }
    setDestroyModalVisible(true)
  }

  const handleDestroySubmit = async () => {
    try {
      const values = await destroyForm.validateFields()
      const batch = vaccineBatches.find(b => b.id === values.batchId)
      addDestroyRecord({
        batchId: values.batchId,
        vaccineName: batch?.vaccineName || values.vaccineName,
        batchNo: batch?.batchNo || values.batchNo,
        quantity: values.quantity,
        reason: values.reason,
        destroyMethod: values.destroyMethod,
        operator: values.operator,
        supervisor: values.supervisor,
        destroyTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        remark: values.remark || ''
      })
      updateVaccineBatch(values.batchId, { status: 'destroyed' })
      message.success('销毁记录添加成功')
      setDestroyModalVisible(false)
      destroyForm.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleOpenEventModal = () => {
    eventForm.resetFields()
    setEventModalVisible(true)
  }

  const handleEventSubmit = async () => {
    try {
      const values = await eventForm.validateFields()
      addChainBreakEvent({
        eventType: values.eventType,
        description: values.description,
        location: values.location,
        startTime: values.startTime.format('YYYY-MM-DD HH:mm:ss'),
        affectedBatches: values.affectedBatches || [],
        status: 'investigating',
        handler: values.handler,
        result: values.result || ''
      })
      message.success('断链事件添加成功')
      setEventModalVisible(false)
      eventForm.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleOpenHandleEventModal = (event: ChainBreakEvent) => {
    setSelectedEvent(event)
    handleEventForm.resetFields()
    handleEventForm.setFieldsValue({
      status: event.status
    })
    setHandleEventModalVisible(true)
  }

  const handleEventProcess = async () => {
    try {
      const values = await handleEventForm.validateFields()
      const updates: Partial<ChainBreakEvent> = {
        status: values.status,
        result: values.result
      }
      if (values.status === 'closed') {
        updates.endTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
      }
      updateChainBreakEvent(selectedEvent!.id, updates)
      message.success('事件处理成功')
      setHandleEventModalVisible(false)
      handleEventForm.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const showDetail = (type: 'batch' | 'destroy' | 'event', data: any) => {
    setDetailType(type)
    if (type === 'batch') setSelectedBatch(data)
    if (type === 'destroy') setSelectedDestroyRecord(data)
    if (type === 'event') setSelectedEvent(data)
    setDetailModalVisible(true)
  }

  const nearExpireColumns: ColumnsType<VaccineBatch> = [
    {
      title: '疫苗名称',
      dataIndex: 'vaccineName',
      key: 'vaccineName',
      width: 160,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: '批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 140,
      render: (text) => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{text}</code>
    },
    {
      title: '生产日期',
      dataIndex: 'produceDate',
      key: 'produceDate',
      width: 120
    },
    {
      title: '有效期',
      dataIndex: 'expireDate',
      key: 'expireDate',
      width: 120
    },
    {
      title: '剩余天数',
      key: 'remainingDays',
      width: 120,
      render: (_, record) => {
        const days = getRemainingDays(record.expireDate)
        const color = getDayColor(days)
        const status = getDayStatus(days)
        return (
          <Space>
            <ClockCircleOutlined style={{ color }} />
            <span style={{ color, fontWeight: 500 }}>
              {days <= 0 ? '已过期' : `${days}天`}
            </span>
            {status !== 'normal' && (
              <Tag color={status === 'expired' ? 'red' : 'orange'}>
                {status === 'expired' ? '过期' : '预警'}
              </Tag>
            )}
          </Space>
        )
      }
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (text, record) => (
        <span>{text.toLocaleString()} {record.unit}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => {
        const days = getRemainingDays(record.expireDate)
        const displayStatus = getDayStatus(days)
        const info = batchStatusMap[displayStatus] || batchStatusMap.normal
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => {
        const days = getRemainingDays(record.expireDate)
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showDetail('batch', record)}
            >
              详情
            </Button>
            {days <= 0 && (
              <Button
                type="link"
                danger
                size="small"
                onClick={() => handleOpenDestroyModal(record)}
              >
                销毁
              </Button>
            )}
          </Space>
        )
      }
    }
  ]

  const destroyColumns: ColumnsType<DestroyRecord> = [
    {
      title: '疫苗名称',
      dataIndex: 'vaccineName',
      key: 'vaccineName',
      width: 160,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: '批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 140,
      render: (text) => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{text}</code>
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (text) => <span>{text.toLocaleString()} 支</span>
    },
    {
      title: '销毁原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      ellipsis: true
    },
    {
      title: '销毁方式',
      dataIndex: 'destroyMethod',
      key: 'destroyMethod',
      width: 140
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100
    },
    {
      title: '监督人',
      dataIndex: 'supervisor',
      key: 'supervisor',
      width: 100
    },
    {
      title: '销毁时间',
      dataIndex: 'destroyTime',
      key: 'destroyTime',
      width: 160
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => showDetail('destroy', record)}
        >
          详情
        </Button>
      )
    }
  ]

  const eventColumns: ColumnsType<ChainBreakEvent> = [
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 120,
      render: (type) => {
        const info = eventTypeMap[type] || eventTypeMap.other
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '事件描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true
    },
    {
      title: '发生位置',
      dataIndex: 'location',
      key: 'location',
      width: 160
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160
    },
    {
      title: '涉及批次',
      dataIndex: 'affectedBatches',
      key: 'affectedBatches',
      width: 120,
      render: (batches) => (
        <span>{batches?.length || 0} 个批次</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const info = eventStatusMap[status] || eventStatusMap.investigating
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '处理人',
      dataIndex: 'handler',
      key: 'handler',
      width: 100
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail('event', record)}
          >
            详情
          </Button>
          {record.status !== 'closed' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleOpenHandleEventModal(record)}
            >
              处理
            </Button>
          )}
        </Space>
      )
    }
  ]

  const nearExpireTabContent = (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="近效期批次"
              value={warningStats.nearExpireCount}
              prefix={<WarningOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="过期批次"
              value={warningStats.expiredCount}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="30天内到期"
              value={warningStats.within30Days}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="60天内到期"
              value={warningStats.within60Days}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <Statistic
              title="90天内到期"
              value={warningStats.within90Days}
              prefix={<ClockCircleOutlined style={{ color: '#fadb14' }} />}
              valueStyle={{ color: '#fadb14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card bordered={false} style={{ borderRadius: 8, background: '#f6ffed' }}>
            <Statistic
              title="库存正常"
              value={vaccineBatches.filter(b => b.status !== 'destroyed').length - warningStats.nearExpireCount - warningStats.expiredCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="疫苗名称"
            prefix={<SearchOutlined />}
            value={nearExpireFilters.vaccineName}
            onChange={(e) => setNearExpireFilters({ ...nearExpireFilters, vaccineName: e.target.value })}
            style={{ width: 160 }}
            allowClear
          />
          <Input
            placeholder="批号"
            value={nearExpireFilters.batchNo}
            onChange={(e) => setNearExpireFilters({ ...nearExpireFilters, batchNo: e.target.value })}
            style={{ width: 140 }}
            allowClear
          />
          <Select
            placeholder="剩余天数范围"
            value={nearExpireFilters.dayRange || undefined}
            onChange={(value) => setNearExpireFilters({ ...nearExpireFilters, dayRange: value || '' })}
            style={{ width: 160 }}
            allowClear
          >
            <Option value="30">30天内</Option>
            <Option value="60">60天内</Option>
            <Option value="90">90天内</Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={nearExpireColumns}
        dataSource={filteredNearExpireBatches}
        rowKey="id"
        scroll={{ x: 1100 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条预警记录`
        }}
      />
    </>
  )

  const destroyTabContent = (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="疫苗名称"
            prefix={<SearchOutlined />}
            value={destroyFilters.vaccineName}
            onChange={(e) => setDestroyFilters({ ...destroyFilters, vaccineName: e.target.value })}
            style={{ width: 160 }}
            allowClear
          />
          <Input
            placeholder="批号"
            value={destroyFilters.batchNo}
            onChange={(e) => setDestroyFilters({ ...destroyFilters, batchNo: e.target.value })}
            style={{ width: 140 }}
            allowClear
          />
          <Select
            placeholder="销毁方式"
            value={destroyFilters.destroyMethod || undefined}
            onChange={(value) => setDestroyFilters({ ...destroyFilters, destroyMethod: value || '' })}
            style={{ width: 160 }}
            allowClear
          >
            {destroyMethodOptions.map(method => (
              <Option key={method} value={method}>{method}</Option>
            ))}
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenDestroyModal()}
          disabled={expiredBatches.length === 0}
        >
          新增销毁记录
        </Button>
      </div>

      <Table
        columns={destroyColumns}
        dataSource={filteredDestroyRecords}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条销毁记录`
        }}
      />
    </>
  )

  const eventTabContent = (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Select
            placeholder="事件类型"
            value={eventFilters.eventType || undefined}
            onChange={(value) => setEventFilters({ ...eventFilters, eventType: value || '' })}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="temperature">温度异常</Option>
            <Option value="transport">运输异常</Option>
            <Option value="storage">存储异常</Option>
            <Option value="other">其他</Option>
          </Select>
          <Select
            placeholder="事件状态"
            value={eventFilters.status || undefined}
            onChange={(value) => setEventFilters({ ...eventFilters, status: value || '' })}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="investigating">调查中</Option>
            <Option value="processing">处理中</Option>
            <Option value="closed">已关闭</Option>
          </Select>
          <Input
            placeholder="发生位置"
            prefix={<SearchOutlined />}
            value={eventFilters.location}
            onChange={(e) => setEventFilters({ ...eventFilters, location: e.target.value })}
            style={{ width: 160 }}
            allowClear
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenEventModal}
        >
          新增事件
        </Button>
      </div>

      <Table
        columns={eventColumns}
        dataSource={filteredEvents}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条断链事件`
        }}
      />
    </>
  )

  const renderDetailContent = () => {
    if (detailType === 'batch' && selectedBatch) {
      const days = getRemainingDays(selectedBatch.expireDate)
      const color = getDayColor(days)
      return (
        <div style={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>疫苗名称：</span>
                <span style={{ fontWeight: 500 }}>{selectedBatch.vaccineName}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>批号：</span>
                <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{selectedBatch.batchNo}</code>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>生产日期：</span>
                <span>{selectedBatch.produceDate}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>有效期：</span>
                <span>{selectedBatch.expireDate}</span>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>剩余天数：</span>
                <span style={{ color, fontWeight: 500 }}>{days <= 0 ? '已过期' : `${days}天`}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>数量：</span>
                <span>{selectedBatch.quantity.toLocaleString()} {selectedBatch.unit}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>状态：</span>
                {(() => {
                  const status = getDayStatus(days)
                  const info = batchStatusMap[status] || batchStatusMap.normal
                  return <Tag color={info.color}>{info.text}</Tag>
                })()}
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>追溯码范围：</span>
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  <div>起：{selectedBatch.traceCodeStart}</div>
                  <div>止：{selectedBatch.traceCodeEnd}</div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )
    }

    if (detailType === 'destroy' && selectedDestroyRecord) {
      return (
        <div style={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>疫苗名称：</span>
                <span style={{ fontWeight: 500 }}>{selectedDestroyRecord.vaccineName}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>批号：</span>
                <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{selectedDestroyRecord.batchNo}</code>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>销毁数量：</span>
                <span>{selectedDestroyRecord.quantity.toLocaleString()} 支</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>销毁原因：</span>
                <span>{selectedDestroyRecord.reason}</span>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>销毁方式：</span>
                <span>{selectedDestroyRecord.destroyMethod}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>操作人：</span>
                <span>{selectedDestroyRecord.operator}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>监督人：</span>
                <span>{selectedDestroyRecord.supervisor}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>销毁时间：</span>
                <span>{selectedDestroyRecord.destroyTime}</span>
              </div>
            </Col>
          </Row>
          {selectedDestroyRecord.remark && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <span style={{ color: '#888' }}>备注：</span>
              <span>{selectedDestroyRecord.remark}</span>
            </div>
          )}
        </div>
      )
    }

    if (detailType === 'event' && selectedEvent) {
      return (
        <div style={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>事件类型：</span>
                {(() => {
                  const info = eventTypeMap[selectedEvent.eventType] || eventTypeMap.other
                  return <Tag color={info.color}>{info.text}</Tag>
                })()}
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>发生位置：</span>
                <span>{selectedEvent.location}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>开始时间：</span>
                <span>{selectedEvent.startTime}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>结束时间：</span>
                <span>{selectedEvent.endTime || '-'}</span>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>状态：</span>
                {(() => {
                  const info = eventStatusMap[selectedEvent.status] || eventStatusMap.investigating
                  return <Tag color={info.color}>{info.text}</Tag>
                })()}
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>处理人：</span>
                <span>{selectedEvent.handler}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>涉及批次：</span>
                <span>{selectedEvent.affectedBatches?.join('、') || '无'}</span>
              </div>
            </Col>
          </Row>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#888' }}>事件描述：</span>
              <span>{selectedEvent.description}</span>
            </div>
            {selectedEvent.result && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ color: '#888' }}>处理结果：</span>
                <span>{selectedEvent.result}</span>
              </div>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'nearExpire', label: '近效期预警', children: nearExpireTabContent },
          { key: 'destroy', label: '过期疫苗销毁', children: destroyTabContent },
          { key: 'chainBreak', label: '断链事件处置', children: eventTabContent }
        ]}
      />

      <Modal
        title="新增销毁记录"
        open={destroyModalVisible}
        onOk={handleDestroySubmit}
        onCancel={() => {
          setDestroyModalVisible(false)
          destroyForm.resetFields()
        }}
        okText="确认销毁"
        cancelText="取消"
        width={600}
        okButtonProps={{ danger: true }}
      >
        <Form form={destroyForm} layout="vertical">
          <Form.Item
            name="batchId"
            label="选择过期批次"
            rules={[{ required: true, message: '请选择过期批次' }]}
          >
            <Select placeholder="请选择过期批次" showSearch optionFilterProp="label">
              {expiredBatches.map(batch => (
                <Option key={batch.id} value={batch.id} label={`${batch.vaccineName} - ${batch.batchNo}`}>
                  {batch.vaccineName} - {batch.batchNo} (剩余{getRemainingDays(batch.expireDate) <= 0 ? '已过期' : `${getRemainingDays(batch.expireDate)}天`})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="vaccineName"
              label="疫苗名称"
              rules={[{ required: true, message: '请输入疫苗名称' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入疫苗名称" />
            </Form.Item>
            <Form.Item
              name="batchNo"
              label="批号"
              rules={[{ required: true, message: '请输入批号' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入批号" />
            </Form.Item>
          </div>
          <Form.Item
            name="quantity"
            label="销毁数量"
            rules={[{ required: true, message: '请输入销毁数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入销毁数量" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="销毁原因"
            rules={[{ required: true, message: '请输入销毁原因' }]}
          >
            <Select placeholder="请选择销毁原因">
              <Option value="超过有效期">超过有效期</Option>
              <Option value="冷链断链超温">冷链断链超温</Option>
              <Option value="包装破损">包装破损</Option>
              <Option value="质量问题">质量问题</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="destroyMethod"
            label="销毁方式"
            rules={[{ required: true, message: '请选择销毁方式' }]}
          >
            <Select placeholder="请选择销毁方式">
              {destroyMethodOptions.map(method => (
                <Option key={method} value={method}>{method}</Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="operator"
              label="操作人"
              rules={[{ required: true, message: '请输入操作人' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入操作人" />
            </Form.Item>
            <Form.Item
              name="supervisor"
              label="监督人"
              rules={[{ required: true, message: '请输入监督人' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入监督人" />
            </Form.Item>
          </div>
          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增断链事件"
        open={eventModalVisible}
        onOk={handleEventSubmit}
        onCancel={() => {
          setEventModalVisible(false)
          eventForm.resetFields()
        }}
        okText="确认添加"
        cancelText="取消"
        width={600}
      >
        <Form form={eventForm} layout="vertical">
          <Form.Item
            name="eventType"
            label="事件类型"
            rules={[{ required: true, message: '请选择事件类型' }]}
          >
            <Select placeholder="请选择事件类型">
              <Option value="temperature">温度异常</Option>
              <Option value="transport">运输异常</Option>
              <Option value="storage">存储异常</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="事件描述"
            rules={[{ required: true, message: '请输入事件描述' }]}
          >
            <TextArea rows={3} placeholder="请详细描述事件情况" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="location"
              label="发生位置"
              rules={[{ required: true, message: '请输入发生位置' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入发生位置" />
            </Form.Item>
            <Form.Item
              name="startTime"
              label="开始时间"
              rules={[{ required: true, message: '请选择开始时间' }]}
              style={{ flex: 1 }}
            >
              <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
          </div>
          <Form.Item
            name="handler"
            label="处理人"
            rules={[{ required: true, message: '请输入处理人' }]}
          >
            <Input placeholder="请输入处理人" />
          </Form.Item>
          <Form.Item
            name="affectedBatches"
            label="涉及批次"
          >
            <Select mode="multiple" placeholder="请选择涉及的批次" showSearch optionFilterProp="label">
              {vaccineBatches.filter(b => b.status !== 'destroyed').map(batch => (
                <Option key={batch.id} value={batch.batchNo} label={`${batch.vaccineName} - ${batch.batchNo}`}>
                  {batch.vaccineName} - {batch.batchNo}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理断链事件"
        open={handleEventModalVisible}
        onOk={handleEventProcess}
        onCancel={() => {
          setHandleEventModalVisible(false)
          handleEventForm.resetFields()
        }}
        okText="确认处理"
        cancelText="取消"
        width={500}
      >
        {selectedEvent && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#888' }}>事件：</span>
              <span style={{ fontWeight: 500 }}>{selectedEvent.description}</span>
            </div>
            <div>
              <span style={{ color: '#888' }}>当前状态：</span>
              {(() => {
                const info = eventStatusMap[selectedEvent.status] || eventStatusMap.investigating
                return <Tag color={info.color}>{info.text}</Tag>
              })()}
            </div>
          </div>
        )}
        <Form form={handleEventForm} layout="vertical">
          <Form.Item
            name="status"
            label="更新状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择新的状态">
              <Option value="investigating">调查中</Option>
              <Option value="processing">处理中</Option>
              <Option value="closed">已关闭</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="result"
            label="处理结果"
            rules={[{ required: true, message: '请输入处理结果' }]}
          >
            <TextArea rows={4} placeholder="请详细描述处理结果和措施" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {renderDetailContent()}
      </Modal>
    </>
  )
}
