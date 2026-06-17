import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Tabs, Table, Button, Form, Input, Select, Modal, InputNumber,
  Space, message, Tag, Timeline, Card, Descriptions, Row, Col
} from 'antd'
import {
  SendOutlined, ScanOutlined, CheckCircleOutlined,
  PlusOutlined, SearchOutlined, ClockCircleOutlined,
  QrcodeOutlined, InboxOutlined, UserOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import type { DistributionRecord, TraceCodeRecord } from '@/types'

const { Option } = Select
const { TextArea } = Input

type TabKey = 'distribution' | 'traceScan' | 'receiveConfirm'

type ScanAction = '入库' | '出库' | '配送' | '接种'

const statusColorMap: Record<string, string> = {
  pending: 'orange',
  received: 'green'
}

const statusTextMap: Record<string, string> = {
  pending: '待接收',
  received: '已接收'
}

const traceStatusTextMap: Record<string, string> = {
  inStock: '在库',
  distributed: '已分发',
  vaccinated: '已接种',
  destroyed: '已销毁'
}

const traceStatusColorMap: Record<string, string> = {
  inStock: 'blue',
  distributed: 'cyan',
  vaccinated: 'green',
  destroyed: 'red'
}

const actionColorMap: Record<string, string> = {
  '入库': 'blue',
  '出库': 'orange',
  '配送': 'cyan',
  '接种': 'green'
}

export default function VaccinationDistribution() {
  const [activeTab, setActiveTab] = useState<TabKey>('distribution')
  const [distributeModalOpen, setDistributeModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [distributeForm] = Form.useForm()
  const [receiveForm] = Form.useForm()
  const [scanForm] = Form.useForm()
  const [distributionSearch, setDistributionSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [receivedSearch, setReceivedSearch] = useState('')
  const [traceCodeInput, setTraceCodeInput] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<DistributionRecord | null>(null)
  const [selectedTraceCode, setSelectedTraceCode] = useState<string>('')
  const scanInputRef = useRef<any>(null)

  const {
    distributionRecords,
    vaccineBatches,
    clinics,
    traceCodeRecords,
    addDistributionRecord,
    updateDistributionRecord,
    addTraceCodeRecord,
    updateTraceCodeRecord,
    updateVaccineBatch
  } = useAppStore()

  useEffect(() => {
    if (activeTab === 'traceScan' && scanInputRef.current) {
      scanInputRef.current.focus()
    }
  }, [activeTab])

  const distributionList = useMemo(() => {
    return distributionRecords
      .filter(r => !distributionSearch ||
        r.vaccineName.includes(distributionSearch) ||
        r.batchNo.includes(distributionSearch) ||
        r.clinicName.includes(distributionSearch) ||
        r.distributor.includes(distributionSearch)
      )
      .sort((a, b) => dayjs(b.distributeTime).valueOf() - dayjs(a.distributeTime).valueOf())
  }, [distributionRecords, distributionSearch])

  const pendingList = useMemo(() => {
    return distributionRecords
      .filter(r => r.receiveStatus === 'pending')
      .filter(r => !pendingSearch ||
        r.vaccineName.includes(pendingSearch) ||
        r.batchNo.includes(pendingSearch) ||
        r.clinicName.includes(pendingSearch)
      )
      .sort((a, b) => dayjs(b.distributeTime).valueOf() - dayjs(a.distributeTime).valueOf())
  }, [distributionRecords, pendingSearch])

  const receivedList = useMemo(() => {
    return distributionRecords
      .filter(r => r.receiveStatus === 'received')
      .filter(r => !receivedSearch ||
        r.vaccineName.includes(receivedSearch) ||
        r.batchNo.includes(receivedSearch) ||
        r.clinicName.includes(receivedSearch)
      )
      .sort((a, b) => dayjs(b.receiveTime!).valueOf() - dayjs(a.receiveTime!).valueOf())
  }, [distributionRecords, receivedSearch])

  const foundTraceRecord = useMemo(() => {
    if (!traceCodeInput.trim()) return null
    return traceCodeRecords.find(t => t.traceCode === traceCodeInput.trim())
  }, [traceCodeRecords, traceCodeInput])

  const availableBatches = useMemo(() => {
    return vaccineBatches.filter(b => b.status !== 'expired' && b.status !== 'destroyed' && b.quantity > 0)
  }, [vaccineBatches])

  const generateTraceCodes = (batchId: string, quantity: number): string[] => {
    const batch = vaccineBatches.find(b => b.id === batchId)
    if (!batch) return []
    const codes: string[] = []
    const prefix = batch.traceCodeStart.replace(/\d+$/, '')
    const startNum = parseInt(batch.traceCodeStart.match(/\d+$/)?.[0] || '1')
    for (let i = 0; i < Math.min(quantity, 10); i++) {
      codes.push(`${prefix}${(startNum + i).toString().padStart(5, '0')}`)
    }
    return codes
  }

  const handleDistributeSubmit = async () => {
    try {
      const values = await distributeForm.validateFields()
      const batch = vaccineBatches.find(b => b.id === values.batchId)
      const clinic = clinics.find(c => c.id === values.clinicId)

      if (!batch) {
        message.error('未找到对应的疫苗批次')
        return
      }
      if (!clinic) {
        message.error('未找到对应的接种门诊')
        return
      }
      if (values.quantity > batch.quantity) {
        message.error('分发数量不能大于库存数量')
        return
      }

      const traceCodes = generateTraceCodes(values.batchId, values.quantity)

      const record: Omit<DistributionRecord, 'id'> = {
        batchId: values.batchId,
        vaccineName: batch.vaccineName,
        batchNo: batch.batchNo,
        quantity: values.quantity,
        clinicId: values.clinicId,
        clinicName: clinic.name,
        distributor: values.distributor,
        distributeTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        traceCodes,
        receiveStatus: 'pending'
      }

      addDistributionRecord(record)
      updateVaccineBatch(batch.id, { quantity: batch.quantity - values.quantity })

      traceCodes.forEach(code => {
        const existingRecord = traceCodeRecords.find(t => t.traceCode === code)
        if (existingRecord) {
          updateTraceCodeRecord(code, {
            status: 'distributed',
            currentLocation: clinic.name,
            scanHistory: [
              ...existingRecord.scanHistory,
              {
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                location: '市疾控中心',
                operator: values.distributor,
                action: '出库'
              },
              {
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                location: '配送中',
                operator: values.distributor,
                action: '配送'
              }
            ]
          })
        } else {
          const newTraceRecord: Omit<TraceCodeRecord, 'id'> = {
            traceCode: code,
            batchId: batch.id,
            vaccineName: batch.vaccineName,
            batchNo: batch.batchNo,
            status: 'distributed',
            currentLocation: clinic.name,
            scanHistory: [
              {
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                location: '市疾控中心',
                operator: values.distributor,
                action: '出库'
              },
              {
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                location: '配送中',
                operator: values.distributor,
                action: '配送'
              }
            ]
          }
          addTraceCodeRecord(newTraceRecord as TraceCodeRecord)
        }
      })

      message.success('分发登记成功')
      setDistributeModalOpen(false)
      distributeForm.resetFields()
    } catch (error) {
      console.error('分发登记失败:', error)
    }
  }

  const handleReceiveSubmit = async () => {
    try {
      const values = await receiveForm.validateFields()
      if (!selectedRecord) return

      updateDistributionRecord(selectedRecord.id, {
        receiveStatus: 'received',
        receiveTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        receiver: values.receiver
      })

      selectedRecord.traceCodes.forEach(code => {
        const traceRecord = traceCodeRecords.find(t => t.traceCode === code)
        if (traceRecord) {
          updateTraceCodeRecord(code, {
            status: 'distributed',
            currentLocation: selectedRecord.clinicName,
            scanHistory: [
              ...traceRecord.scanHistory,
              {
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                location: selectedRecord.clinicName,
                operator: values.receiver,
                action: '入库'
              }
            ]
          })
        }
      })

      message.success('接收确认成功')
      setReceiveModalOpen(false)
      receiveForm.resetFields()
      setSelectedRecord(null)
    } catch (error) {
      console.error('接收确认失败:', error)
    }
  }

  const handleScanSubmit = async () => {
    try {
      const values = await scanForm.validateFields()
      const traceRecord = traceCodeRecords.find(t => t.traceCode === selectedTraceCode)

      if (!traceRecord) {
        message.error('未找到对应的追溯码记录')
        return
      }

      let newStatus = traceRecord.status
      let newLocation = traceRecord.currentLocation

      switch (values.action as ScanAction) {
        case '入库':
          newStatus = 'inStock'
          newLocation = values.location || traceRecord.currentLocation
          break
        case '出库':
          newStatus = 'distributed'
          newLocation = '配送中'
          break
        case '配送':
          newStatus = 'distributed'
          newLocation = values.location || traceRecord.currentLocation
          break
        case '接种':
          newStatus = 'vaccinated'
          newLocation = traceRecord.currentLocation
          break
      }

      updateTraceCodeRecord(selectedTraceCode, {
        status: newStatus,
        currentLocation: newLocation,
        scanHistory: [
          ...traceRecord.scanHistory,
          {
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            location: values.location || traceRecord.currentLocation,
            operator: values.operator,
            action: values.action
          }
        ]
      })

      message.success('扫描记录已添加')
      setScanModalOpen(false)
      scanForm.resetFields()
      setSelectedTraceCode('')
    } catch (error) {
      console.error('添加扫描记录失败:', error)
    }
  }

  const handleBatchChange = (batchId: string) => {
    const batch = vaccineBatches.find(b => b.id === batchId)
    if (batch) {
      distributeForm.setFieldsValue({
        vaccineName: batch.vaccineName,
        batchNo: batch.batchNo,
        unit: batch.unit,
        maxQuantity: batch.quantity
      })
    }
  }

  const openReceiveModal = (record: DistributionRecord) => {
    setSelectedRecord(record)
    receiveForm.setFieldsValue({
      vaccineName: record.vaccineName,
      batchNo: record.batchNo,
      quantity: record.quantity,
      clinicName: record.clinicName,
      distributor: record.distributor,
      distributeTime: record.distributeTime
    })
    setReceiveModalOpen(true)
  }

  const openScanModal = (traceCode: string) => {
    setSelectedTraceCode(traceCode)
    const record = traceCodeRecords.find(t => t.traceCode === traceCode)
    if (record) {
      scanForm.setFieldsValue({
        vaccineName: record.vaccineName,
        batchNo: record.batchNo,
        location: record.currentLocation
      })
    }
    setScanModalOpen(true)
  }

  const handleScanKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (traceCodeInput.trim()) {
        const record = traceCodeRecords.find(t => t.traceCode === traceCodeInput.trim())
        if (record) {
          openScanModal(traceCodeInput.trim())
        } else {
          message.warning('未找到该追溯码对应的疫苗信息')
        }
      }
    }
  }

  const showDistributionDetail = (record: DistributionRecord) => {
    Modal.info({
      title: '分发详情',
      content: (
        <div style={{ lineHeight: 2 }}>
          <p><strong>疫苗名称：</strong>{record.vaccineName}</p>
          <p><strong>批号：</strong>{record.batchNo}</p>
          <p><strong>数量：</strong>{record.quantity} 支</p>
          <p><strong>接种门诊：</strong>{record.clinicName}</p>
          <p><strong>分发人：</strong>{record.distributor}</p>
          <p><strong>分发时间：</strong>{record.distributeTime}</p>
          <p><strong>接收状态：</strong>
            <Tag color={statusColorMap[record.receiveStatus]}>
              {statusTextMap[record.receiveStatus]}
            </Tag>
          </p>
          {record.receiveStatus === 'received' && (
            <>
              <p><strong>接收人：</strong>{record.receiver}</p>
              <p><strong>接收时间：</strong>{record.receiveTime}</p>
            </>
          )}
          <p><strong>追溯码列表：</strong></p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {record.traceCodes.map(code => (
              <Tag key={code} color="blue">{code}</Tag>
            ))}
          </div>
        </div>
      ),
      width: 600
    })
  }

  const distributionColumns = [
    {
      title: '疫苗名称',
      dataIndex: 'vaccineName',
      key: 'vaccineName',
      width: 150,
    },
    {
      title: '批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 130,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (val: number) => `${val} 支`,
    },
    {
      title: '接种门诊',
      dataIndex: 'clinicName',
      key: 'clinicName',
      width: 200,
    },
    {
      title: '分发人',
      dataIndex: 'distributor',
      key: 'distributor',
      width: 100,
    },
    {
      title: '分发时间',
      dataIndex: 'distributeTime',
      key: 'distributeTime',
      width: 160,
    },
    {
      title: '接收状态',
      dataIndex: 'receiveStatus',
      key: 'receiveStatus',
      width: 100,
      render: (val: string) => (
        <Tag color={statusColorMap[val]}>
          {statusTextMap[val]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: DistributionRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => showDistributionDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ]

  const pendingColumns = [
    {
      title: '疫苗名称',
      dataIndex: 'vaccineName',
      key: 'vaccineName',
      width: 150,
    },
    {
      title: '批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 130,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (val: number) => `${val} 支`,
    },
    {
      title: '接种门诊',
      dataIndex: 'clinicName',
      key: 'clinicName',
      width: 200,
    },
    {
      title: '分发人',
      dataIndex: 'distributor',
      key: 'distributor',
      width: 100,
    },
    {
      title: '分发时间',
      dataIndex: 'distributeTime',
      key: 'distributeTime',
      width: 160,
    },
    {
      title: '状态',
      dataIndex: 'receiveStatus',
      key: 'receiveStatus',
      width: 100,
      render: () => (
        <Tag icon={<ClockCircleOutlined />} color="orange">
          待接收
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: DistributionRecord) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => openReceiveModal(record)}
          >
            确认接收
          </Button>
        </Space>
      ),
    },
  ]

  const receivedColumns = [
    {
      title: '疫苗名称',
      dataIndex: 'vaccineName',
      key: 'vaccineName',
      width: 150,
    },
    {
      title: '批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 130,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (val: number) => `${val} 支`,
    },
    {
      title: '接种门诊',
      dataIndex: 'clinicName',
      key: 'clinicName',
      width: 200,
    },
    {
      title: '接收人',
      dataIndex: 'receiver',
      key: 'receiver',
      width: 100,
    },
    {
      title: '接收时间',
      dataIndex: 'receiveTime',
      key: 'receiveTime',
      width: 160,
    },
    {
      title: '状态',
      dataIndex: 'receiveStatus',
      key: 'receiveStatus',
      width: 100,
      render: () => (
        <Tag icon={<CheckCircleOutlined />} color="green">
          已接收
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: DistributionRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => showDistributionDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'distribution',
      label: (
        <Space>
          <SendOutlined />
          接种门诊分发
        </Space>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input
              placeholder="搜索疫苗名称、批号、门诊名称、分发人"
              prefix={<SearchOutlined />}
              value={distributionSearch}
              onChange={(e) => setDistributionSearch(e.target.value)}
              style={{ width: 350 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDistributeModalOpen(true)}
            >
              新增分发
            </Button>
          </div>
          <Table
            columns={distributionColumns}
            dataSource={distributionList}
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
      key: 'traceScan',
      label: (
        <Space>
          <ScanOutlined />
          电子追溯码扫描
        </Space>
      ),
      children: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Card title="扫码录入" extra={<QrcodeOutlined style={{ fontSize: 24 }} />}>
                <div style={{ marginBottom: 16 }}>
                  <Input
                    ref={scanInputRef}
                    size="large"
                    placeholder="请使用扫码枪扫描追溯码或手动输入"
                    prefix={<ScanOutlined />}
                    value={traceCodeInput}
                    onChange={(e) => setTraceCodeInput(e.target.value)}
                    onKeyDown={handleScanKeyDown}
                    allowClear
                  />
                  <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                    提示：扫码枪扫描后自动按回车键查询
                  </p>
                </div>

                {foundTraceRecord ? (
                  <div>
                    <Descriptions title="疫苗信息" bordered column={1} size="small">
                      <Descriptions.Item label="追溯码">
                        <Tag color="blue">{foundTraceRecord.traceCode}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="疫苗名称">
                        {foundTraceRecord.vaccineName}
                      </Descriptions.Item>
                      <Descriptions.Item label="批号">
                        {foundTraceRecord.batchNo}
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <Tag color={traceStatusColorMap[foundTraceRecord.status]}>
                          {traceStatusTextMap[foundTraceRecord.status]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="当前位置">
                        {foundTraceRecord.currentLocation}
                      </Descriptions.Item>
                    </Descriptions>
                    <div style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openScanModal(foundTraceRecord.traceCode)}
                        block
                      >
                        新增扫描记录
                      </Button>
                    </div>
                  </div>
                ) : traceCodeInput ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <QrcodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>未找到追溯码 "{traceCodeInput}" 对应的疫苗信息</p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <ScanOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>请扫描或输入追溯码查询疫苗信息</p>
                  </div>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="扫描历史记录">
                {foundTraceRecord && foundTraceRecord.scanHistory.length > 0 ? (
                  <Timeline
                    mode="left"
                    items={foundTraceRecord.scanHistory
                      .slice()
                      .reverse()
                      .map((item, index) => ({
                        color: actionColorMap[item.action] || 'blue',
                        label: item.time,
                        children: (
                          <div>
                            <p style={{ margin: 0 }}>
                              <Tag color={actionColorMap[item.action]}>{item.action}</Tag>
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                              <UserOutlined /> {item.operator}
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                              <InboxOutlined /> {item.location}
                            </p>
                          </div>
                        ),
                      }))}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <ClockCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>暂无扫描记录</p>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'receiveConfirm',
      label: (
        <Space>
          <CheckCircleOutlined />
          门诊接收确认
        </Space>
      ),
      children: (
        <div>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                待接收记录
                <Tag color="orange">{pendingList.length}</Tag>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索疫苗名称、批号、门诊名称"
                prefix={<SearchOutlined />}
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
            </div>
            <Table
              columns={pendingColumns}
              dataSource={pendingList}
              rowKey="id"
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1150 }}
            />
          </Card>

          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                已接收记录
                <Tag color="green">{receivedList.length}</Tag>
              </Space>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索疫苗名称、批号、门诊名称"
                prefix={<SearchOutlined />}
                value={receivedSearch}
                onChange={(e) => setReceivedSearch(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
            </div>
            <Table
              columns={receivedColumns}
              dataSource={receivedList}
              rowKey="id"
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1150 }}
            />
          </Card>
        </div>
      ),
    },
  ]

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={tabItems}
      />

      <Modal
        title="新增分发"
        open={distributeModalOpen}
        onOk={handleDistributeSubmit}
        onCancel={() => {
          setDistributeModalOpen(false)
          distributeForm.resetFields()
        }}
        width={600}
        okText="确认分发"
        cancelText="取消"
      >
        <Form
          form={distributeForm}
          layout="vertical"
        >
          <Form.Item
            name="batchId"
            label="选择疫苗批次"
            rules={[{ required: true, message: '请选择疫苗批次' }]}
          >
            <Select
              placeholder="请选择疫苗批次"
              showSearch
              optionFilterProp="children"
              onChange={handleBatchChange}
            >
              {availableBatches.map(batch => (
                <Option key={batch.id} value={batch.id}>
                  {batch.vaccineName} - {batch.batchNo} (库存: {batch.quantity}{batch.unit})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="vaccineName"
              label="疫苗名称"
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="batchNo"
              label="批号"
            >
              <Input disabled />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="quantity"
              label="分发数量"
              rules={[{ required: true, message: '请输入分发数量' }]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="请输入数量"
              />
            </Form.Item>
            <Form.Item
              name="unit"
              label="单位"
            >
              <Input disabled />
            </Form.Item>
          </div>
          <Form.Item
            name="clinicId"
            label="选择接种门诊"
            rules={[{ required: true, message: '请选择接种门诊' }]}
          >
            <Select
              placeholder="请选择接种门诊"
              showSearch
              optionFilterProp="children"
            >
              {clinics.map(clinic => (
                <Option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="distributor"
            label="分发人"
            rules={[{ required: true, message: '请输入分发人' }]}
          >
            <Input placeholder="请输入分发人姓名" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="确认接收"
        open={receiveModalOpen}
        onOk={handleReceiveSubmit}
        onCancel={() => {
          setReceiveModalOpen(false)
          receiveForm.resetFields()
          setSelectedRecord(null)
        }}
        width={500}
        okText="确认接收"
        cancelText="取消"
      >
        <Form
          form={receiveForm}
          layout="vertical"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="vaccineName"
              label="疫苗名称"
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="batchNo"
              label="批号"
            >
              <Input disabled />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="quantity"
              label="数量"
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="clinicName"
              label="接种门诊"
            >
              <Input disabled />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="distributor"
              label="分发人"
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="distributeTime"
              label="分发时间"
            >
              <Input disabled />
            </Form.Item>
          </div>
          <Form.Item
            name="receiver"
            label="接收人"
            rules={[{ required: true, message: '请输入接收人' }]}
          >
            <Input placeholder="请输入接收人姓名" />
          </Form.Item>
          <Form.Item
            label="接收时间"
          >
            <Input
              value={dayjs().format('YYYY-MM-DD HH:mm:ss')}
              disabled
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增扫描记录"
        open={scanModalOpen}
        onOk={handleScanSubmit}
        onCancel={() => {
          setScanModalOpen(false)
          scanForm.resetFields()
          setSelectedTraceCode('')
        }}
        width={500}
        okText="确认添加"
        cancelText="取消"
      >
        <Form
          form={scanForm}
          layout="vertical"
        >
          <Form.Item
            label="追溯码"
          >
            <Input value={selectedTraceCode} disabled />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="vaccineName"
              label="疫苗名称"
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="batchNo"
              label="批号"
            >
              <Input disabled />
            </Form.Item>
          </div>
          <Form.Item
            name="action"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型">
              <Option value="入库">入库</Option>
              <Option value="出库">出库</Option>
              <Option value="配送">配送</Option>
              <Option value="接种">接种</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="location"
            label="位置"
            rules={[{ required: true, message: '请输入位置' }]}
          >
            <Input placeholder="请输入当前位置" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作员"
            rules={[{ required: true, message: '请输入操作员' }]}
          >
            <Input placeholder="请输入操作员姓名" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
