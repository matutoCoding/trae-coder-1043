import { useState, useMemo } from 'react'
import {
  Tabs, Table, Button, Form, Input, Select, Modal, InputNumber,
  Space, message, Tag, Tooltip
} from 'antd'
import {
  ImportOutlined, ExportOutlined, PlusOutlined,
  SearchOutlined, InboxOutlined, SendOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import type { StockRecord } from '@/types'

const { Option } = Select
const { TextArea } = Input

type TabKey = 'stockIn' | 'stockOut' | 'flow'

export default function StockInOut() {
  const [activeTab, setActiveTab] = useState<TabKey>('stockIn')
  const [stockInModalOpen, setStockInModalOpen] = useState(false)
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false)
  const [stockInForm] = Form.useForm()
  const [stockOutForm] = Form.useForm()
  const [stockInSearch, setStockInSearch] = useState('')
  const [stockOutSearch, setStockOutSearch] = useState('')
  const [flowSearch, setFlowSearch] = useState('')

  const { stockRecords, vaccineBatches, addStockRecord, updateVaccineBatch } = useAppStore()

  const stockInRecords = useMemo(() => {
    return stockRecords
      .filter(r => r.type === 'in')
      .filter(r => !stockInSearch || 
        r.vaccineName.includes(stockInSearch) || 
        r.batchNo.includes(stockInSearch) ||
        (r.source && r.source.includes(stockInSearch))
      )
      .sort((a, b) => dayjs(b.operateTime).valueOf() - dayjs(a.operateTime).valueOf())
  }, [stockRecords, stockInSearch])

  const stockOutRecords = useMemo(() => {
    return stockRecords
      .filter(r => r.type === 'out')
      .filter(r => !stockOutSearch || 
        r.vaccineName.includes(stockOutSearch) || 
        r.batchNo.includes(stockOutSearch) ||
        (r.target && r.target.includes(stockOutSearch))
      )
      .sort((a, b) => dayjs(b.operateTime).valueOf() - dayjs(a.operateTime).valueOf())
  }, [stockRecords, stockOutSearch])

  const flowRecords = useMemo(() => {
    return stockRecords
      .filter(r => !flowSearch || 
        r.vaccineName.includes(flowSearch) || 
        r.batchNo.includes(flowSearch)
      )
      .sort((a, b) => dayjs(b.operateTime).valueOf() - dayjs(a.operateTime).valueOf())
  }, [stockRecords, flowSearch])

  const availableBatches = useMemo(() => {
    return vaccineBatches.filter(b => b.status !== 'expired' && b.status !== 'destroyed')
  }, [vaccineBatches])

  const handleStockInSubmit = async () => {
    try {
      const values = await stockInForm.validateFields()
      const batch = vaccineBatches.find(b => b.id === values.batchId)
      if (!batch) {
        message.error('未找到对应的疫苗批次')
        return
      }

      const record: Omit<StockRecord, 'id'> = {
        type: 'in',
        batchId: values.batchId,
        vaccineName: batch.vaccineName,
        batchNo: batch.batchNo,
        quantity: values.quantity,
        unit: batch.unit,
        operator: '管理员',
        operateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        remark: values.remark || '',
        source: values.source,
        acceptanceResult: values.acceptanceResult,
        acceptanceRemark: values.acceptanceRemark
      }

      addStockRecord(record)

      if (values.acceptanceResult === 'passed') {
        updateVaccineBatch(batch.id, { quantity: batch.quantity + values.quantity })
      }

      message.success('入库登记成功')
      setStockInModalOpen(false)
      stockInForm.resetFields()
    } catch (error) {
      console.error('入库登记失败:', error)
    }
  }

  const handleStockOutSubmit = async () => {
    try {
      const values = await stockOutForm.validateFields()
      const batch = vaccineBatches.find(b => b.id === values.batchId)
      if (!batch) {
        message.error('未找到对应的疫苗批次')
        return
      }

      if (values.quantity > batch.quantity) {
        message.error('出库数量不能大于库存数量')
        return
      }

      const record: Omit<StockRecord, 'id'> = {
        type: 'out',
        batchId: values.batchId,
        vaccineName: batch.vaccineName,
        batchNo: batch.batchNo,
        quantity: values.quantity,
        unit: batch.unit,
        operator: '管理员',
        operateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        remark: values.remark || '',
        target: values.target
      }

      addStockRecord(record)
      updateVaccineBatch(batch.id, { quantity: batch.quantity - values.quantity })

      message.success('出库登记成功')
      setStockOutModalOpen(false)
      stockOutForm.resetFields()
    } catch (error) {
      console.error('出库登记失败:', error)
    }
  }

  const handleBatchChange = (batchId: string, form: any) => {
    const batch = vaccineBatches.find(b => b.id === batchId)
    if (batch) {
      form.setFieldsValue({
        vaccineName: batch.vaccineName,
        batchNo: batch.batchNo,
        unit: batch.unit,
        maxQuantity: batch.quantity
      })
    }
  }

  const stockInColumns = [
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
      render: (val: number, record: StockRecord) => `${val} ${record.unit}`,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 150,
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '操作时间',
      dataIndex: 'operateTime',
      key: 'operateTime',
      width: 160,
    },
    {
      title: '验收结果',
      dataIndex: 'acceptanceResult',
      key: 'acceptanceResult',
      width: 100,
      render: (val: string) => (
        val === 'passed' 
          ? <Tag color="success">验收通过</Tag>
          : <Tag color="error">验收不通过</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: StockRecord) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                Modal.info({
                  title: '入库详情',
                  content: (
                    <div style={{ lineHeight: 2 }}>
                      <p><strong>疫苗名称：</strong>{record.vaccineName}</p>
                      <p><strong>批号：</strong>{record.batchNo}</p>
                      <p><strong>数量：</strong>{record.quantity} {record.unit}</p>
                      <p><strong>来源：</strong>{record.source}</p>
                      <p><strong>操作员：</strong>{record.operator}</p>
                      <p><strong>操作时间：</strong>{record.operateTime}</p>
                      <p><strong>验收结果：</strong>{record.acceptanceResult === 'passed' ? '验收通过' : '验收不通过'}</p>
                      <p><strong>验收备注：</strong>{record.acceptanceRemark || '-'}</p>
                      <p><strong>备注：</strong>{record.remark || '-'}</p>
                    </div>
                  ),
                  width: 500
                })
              }}
            >
              详情
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  const stockOutColumns = [
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
      render: (val: number, record: StockRecord) => `${val} ${record.unit}`,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: '去向',
      dataIndex: 'target',
      key: 'target',
      width: 180,
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '操作时间',
      dataIndex: 'operateTime',
      key: 'operateTime',
      width: 160,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: StockRecord) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                Modal.info({
                  title: '出库详情',
                  content: (
                    <div style={{ lineHeight: 2 }}>
                      <p><strong>疫苗名称：</strong>{record.vaccineName}</p>
                      <p><strong>批号：</strong>{record.batchNo}</p>
                      <p><strong>数量：</strong>{record.quantity} {record.unit}</p>
                      <p><strong>去向：</strong>{record.target}</p>
                      <p><strong>操作员：</strong>{record.operator}</p>
                      <p><strong>操作时间：</strong>{record.operateTime}</p>
                      <p><strong>备注：</strong>{record.remark || '-'}</p>
                    </div>
                  ),
                  width: 500
                })
              }}
            >
              详情
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  const flowColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (val: string) => (
        val === 'in' 
          ? <Tag icon={<ImportOutlined />} color="blue">入库</Tag>
          : <Tag icon={<ExportOutlined />} color="orange">出库</Tag>
      ),
    },
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
      render: (val: number, record: StockRecord) => `${val} ${record.unit}`,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: '来源/去向',
      key: 'direction',
      width: 180,
      render: (_, record: StockRecord) => (
        <Space>
          {record.type === 'in' ? (
            <><InboxOutlined style={{ color: '#1890ff' }} /> {record.source}</>
          ) : (
            <><SendOutlined style={{ color: '#fa8c16' }} /> {record.target}</>
          )}
        </Space>
      ),
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '操作时间',
      dataIndex: 'operateTime',
      key: 'operateTime',
      width: 160,
    },
    {
      title: '验收结果',
      dataIndex: 'acceptanceResult',
      key: 'acceptanceResult',
      width: 100,
      render: (val: string, record: StockRecord) => (
        record.type === 'in' ? (
          val === 'passed' 
            ? <Tag color="success">通过</Tag>
            : <Tag color="error">不通过</Tag>
        ) : '-'
      ),
    },
  ]

  const tabItems = [
    {
      key: 'stockIn',
      label: (
        <Space>
          <ImportOutlined />
          采购入库验收
        </Space>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input
              placeholder="搜索疫苗名称、批号、来源"
              prefix={<SearchOutlined />}
              value={stockInSearch}
              onChange={(e) => setStockInSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setStockInModalOpen(true)}
            >
              新增入库
            </Button>
          </div>
          <Table
            columns={stockInColumns}
            dataSource={stockInRecords}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1100 }}
          />
        </div>
      ),
    },
    {
      key: 'stockOut',
      label: (
        <Space>
          <ExportOutlined />
          出库登记
        </Space>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input
              placeholder="搜索疫苗名称、批号、去向"
              prefix={<SearchOutlined />}
              value={stockOutSearch}
              onChange={(e) => setStockOutSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setStockOutModalOpen(true)}
            >
              新增出库
            </Button>
          </div>
          <Table
            columns={stockOutColumns}
            dataSource={stockOutRecords}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1100 }}
          />
        </div>
      ),
    },
    {
      key: 'flow',
      label: (
        <Space>
          <InboxOutlined />
          出入库流水
        </Space>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="搜索疫苗名称、批号"
              prefix={<SearchOutlined />}
              value={flowSearch}
              onChange={(e) => setFlowSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </div>
          <Table
            columns={flowColumns}
            dataSource={flowRecords}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1100 }}
          />
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
        title="新增入库验收"
        open={stockInModalOpen}
        onOk={handleStockInSubmit}
        onCancel={() => {
          setStockInModalOpen(false)
          stockInForm.resetFields()
        }}
        width={600}
        okText="确认入库"
        cancelText="取消"
      >
        <Form
          form={stockInForm}
          layout="vertical"
          initialValues={{ acceptanceResult: 'passed' }}
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
              onChange={(value) => handleBatchChange(value, stockInForm)}
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
              label="入库数量"
              rules={[{ required: true, message: '请输入入库数量' }]}
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
            name="source"
            label="来源"
            rules={[{ required: true, message: '请输入来源' }]}
          >
            <Input placeholder="如：生产厂家、供应商名称" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="acceptanceResult"
              label="验收结果"
              rules={[{ required: true, message: '请选择验收结果' }]}
            >
              <Select>
                <Option value="passed">验收通过</Option>
                <Option value="failed">验收不通过</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="acceptanceRemark"
            label="验收备注"
          >
            <TextArea
              rows={3}
              placeholder="请输入验收备注信息，如外观检查、冷链温度情况等"
            />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea
              rows={2}
              placeholder="请输入其他备注信息"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增出库登记"
        open={stockOutModalOpen}
        onOk={handleStockOutSubmit}
        onCancel={() => {
          setStockOutModalOpen(false)
          stockOutForm.resetFields()
        }}
        width={600}
        okText="确认出库"
        cancelText="取消"
      >
        <Form
          form={stockOutForm}
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
              onChange={(value) => handleBatchChange(value, stockOutForm)}
            >
              {availableBatches.filter(b => b.quantity > 0).map(batch => (
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
              label="出库数量"
              rules={[{ required: true, message: '请输入出库数量' }]}
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
            name="target"
            label="去向"
            rules={[{ required: true, message: '请输入去向' }]}
          >
            <Select
              placeholder="请选择或输入去向"
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
          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
