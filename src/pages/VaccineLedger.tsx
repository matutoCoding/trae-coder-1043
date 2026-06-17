import { useState, useMemo } from 'react'
import {
  Tabs, Table, Button, Modal, Form, Input, Select, DatePicker,
  InputNumber, Space, Tag, message, Popconfirm
} from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import type { Vaccine, VaccineBatch } from '@/types'

const { Option } = Select
const { RangePicker } = DatePicker

const statusMap: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'green' },
  nearExpire: { text: '近效期', color: 'orange' },
  expired: { text: '已过期', color: 'red' },
  destroyed: { text: '已销毁', color: 'default' }
}

const vaccineTypeOptions = ['灭活疫苗', '减毒活疫苗', '重组疫苗', '多糖疫苗', '结合疫苗', '类毒素疫苗']

export default function VaccineLedger() {
  const { vaccines, vaccineBatches, addVaccine, addVaccineBatch, updateVaccineBatch } = useAppStore()
  const [activeTab, setActiveTab] = useState('vaccine')
  const [vaccineModalVisible, setVaccineModalVisible] = useState(false)
  const [batchModalVisible, setBatchModalVisible] = useState(false)
  const [vaccineForm] = Form.useForm()
  const [batchForm] = Form.useForm()
  const [vaccineSearchText, setVaccineSearchText] = useState('')
  const [batchFilters, setBatchFilters] = useState({ vaccineName: '', batchNo: '', status: '' })

  const filteredVaccines = useMemo(() => {
    if (!vaccineSearchText) return vaccines
    const text = vaccineSearchText.toLowerCase()
    return vaccines.filter(v =>
      v.name.toLowerCase().includes(text) ||
      v.manufacturer.toLowerCase().includes(text) ||
      v.type.toLowerCase().includes(text)
    )
  }, [vaccines, vaccineSearchText])

  const filteredBatches = useMemo(() => {
    return vaccineBatches.filter(b => {
      if (batchFilters.vaccineName && !b.vaccineName.includes(batchFilters.vaccineName)) return false
      if (batchFilters.batchNo && !b.batchNo.includes(batchFilters.batchNo)) return false
      if (batchFilters.status && b.status !== batchFilters.status) return false
      return true
    })
  }, [vaccineBatches, batchFilters])

  const handleAddVaccine = async () => {
    try {
      const values = await vaccineForm.validateFields()
      const newVaccine: Vaccine = {
        ...values,
        createTime: dayjs().format('YYYY-MM-DD')
      }
      addVaccine(newVaccine)
      message.success('疫苗品种添加成功')
      setVaccineModalVisible(false)
      vaccineForm.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleAddBatch = async () => {
    try {
      const values = await batchForm.validateFields()
      const selectedVaccine = vaccines.find(v => v.id === values.vaccineId)
      if (!selectedVaccine) {
        message.error('请选择有效的疫苗品种')
        return
      }
      const newBatch: VaccineBatch = {
        ...values,
        vaccineName: selectedVaccine.name,
        produceDate: values.produceDate.format('YYYY-MM-DD'),
        expireDate: values.expireDate.format('YYYY-MM-DD'),
        status: 'normal',
        createTime: dayjs().format('YYYY-MM-DD')
      }
      addVaccineBatch(newBatch)
      message.success('疫苗批次添加成功')
      setBatchModalVisible(false)
      batchForm.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleDestroyBatch = (id: string) => {
    updateVaccineBatch(id, { status: 'destroyed' })
    message.success('批次已标记为销毁')
  }

  const vaccineColumns: ColumnsType<Vaccine> = [
    {
      title: '疫苗名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: '疫苗类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '生产厂家',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 180
    },
    {
      title: '规格',
      dataIndex: 'specification',
      key: 'specification',
      width: 140
    },
    {
      title: '剂量',
      dataIndex: 'dosage',
      key: 'dosage',
      width: 100
    },
    {
      title: '储存条件',
      dataIndex: 'storageCondition',
      key: 'storageCondition',
      width: 140
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: () => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />}>
          删除
        </Button>
      )
    }
  ]

  const batchColumns: ColumnsType<VaccineBatch> = [
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
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (text, record) => (
        <span>{text.toLocaleString()} {record.unit}</span>
      )
    },
    {
      title: '追溯码范围',
      key: 'traceCode',
      width: 260,
      render: (_, record) => (
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div>起：{record.traceCodeStart}</div>
          <div>止：{record.traceCodeEnd}</div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const info = statusMap[status] || statusMap.normal
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status !== 'destroyed' && (
            <Popconfirm
              title="确认销毁该批次？"
              description="销毁后批次状态将变更为已销毁，此操作不可逆"
              onConfirm={() => handleDestroyBatch(record.id)}
              okText="确认销毁"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" danger size="small">
                销毁
              </Button>
            </Popconfirm>
          )}
          <Button type="link" size="small">详情</Button>
        </Space>
      )
    }
  ]

  const vaccineTabContent = (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Input
          placeholder="搜索疫苗名称、生产厂家或类型"
          prefix={<SearchOutlined />}
          value={vaccineSearchText}
          onChange={(e) => setVaccineSearchText(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setVaccineModalVisible(true)}
        >
          新增疫苗品种
        </Button>
      </div>
      <Table
        columns={vaccineColumns}
        dataSource={filteredVaccines}
        rowKey="id"
        scroll={{ x: 1000 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
      />
    </>
  )

  const batchTabContent = (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="疫苗名称"
            value={batchFilters.vaccineName}
            onChange={(e) => setBatchFilters({ ...batchFilters, vaccineName: e.target.value })}
            style={{ width: 160 }}
            allowClear
          />
          <Input
            placeholder="批号"
            value={batchFilters.batchNo}
            onChange={(e) => setBatchFilters({ ...batchFilters, batchNo: e.target.value })}
            style={{ width: 140 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            value={batchFilters.status || undefined}
            onChange={(value) => setBatchFilters({ ...batchFilters, status: value || '' })}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="normal">正常</Option>
            <Option value="nearExpire">近效期</Option>
            <Option value="expired">已过期</Option>
            <Option value="destroyed">已销毁</Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setBatchModalVisible(true)}
        >
          新增批次
        </Button>
      </div>
      <Table
        columns={batchColumns}
        dataSource={filteredBatches}
        rowKey="id"
        scroll={{ x: 1100 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
      />
    </>
  )

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'vaccine', label: '疫苗品种管理', children: vaccineTabContent },
          { key: 'batch', label: '疫苗批次台账', children: batchTabContent }
        ]}
      />

      <Modal
        title="新增疫苗品种"
        open={vaccineModalVisible}
        onOk={handleAddVaccine}
        onCancel={() => {
          setVaccineModalVisible(false)
          vaccineForm.resetFields()
        }}
        okText="确认添加"
        cancelText="取消"
        width={600}
      >
        <Form
          form={vaccineForm}
          layout="vertical"
          initialValues={{ storageCondition: '2-8℃冷藏' }}
        >
          <Form.Item
            name="name"
            label="疫苗名称"
            rules={[{ required: true, message: '请输入疫苗名称' }]}
          >
            <Input placeholder="请输入疫苗名称" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="type"
              label="疫苗类型"
              rules={[{ required: true, message: '请选择疫苗类型' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="请选择疫苗类型">
                {vaccineTypeOptions.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="dosage"
              label="剂量"
              rules={[{ required: true, message: '请输入剂量' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：0.5ml" />
            </Form.Item>
          </div>
          <Form.Item
            name="manufacturer"
            label="生产厂家"
            rules={[{ required: true, message: '请输入生产厂家' }]}
          >
            <Input placeholder="请输入生产厂家" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="specification"
              label="规格"
              rules={[{ required: true, message: '请输入规格' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：0.5ml/支" />
            </Form.Item>
            <Form.Item
              name="storageCondition"
              label="储存条件"
              rules={[{ required: true, message: '请输入储存条件' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：2-8℃冷藏" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="新增疫苗批次"
        open={batchModalVisible}
        onOk={handleAddBatch}
        onCancel={() => {
          setBatchModalVisible(false)
          batchForm.resetFields()
        }}
        okText="确认添加"
        cancelText="取消"
        width={600}
      >
        <Form
          form={batchForm}
          layout="vertical"
          initialValues={{ unit: '支', quantity: 1000 }}
        >
          <Form.Item
            name="vaccineId"
            label="疫苗品种"
            rules={[{ required: true, message: '请选择疫苗品种' }]}
          >
            <Select placeholder="请选择疫苗品种" showSearch optionFilterProp="label">
              {vaccines.map(v => (
                <Option key={v.id} value={v.id} label={v.name}>
                  {v.name} - {v.specification}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="batchNo"
            label="批号"
            rules={[{ required: true, message: '请输入批号' }]}
          >
            <Input placeholder="如：202601001" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="produceDate"
              label="生产日期"
              rules={[{ required: true, message: '请选择生产日期' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item
              name="expireDate"
              label="有效期"
              rules={[{ required: true, message: '请选择有效期' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="quantity"
              label="数量"
              rules={[{ required: true, message: '请输入数量' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入数量" />
            </Form.Item>
            <Form.Item
              name="unit"
              label="单位"
              rules={[{ required: true, message: '请输入单位' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="请选择单位">
                <Option value="支">支</Option>
                <Option value="瓶">瓶</Option>
                <Option value="剂">剂</Option>
                <Option value="盒">盒</Option>
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="traceCodeStart"
              label="追溯码起始"
              rules={[{ required: true, message: '请输入追溯码起始' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：CN2026010010001" />
            </Form.Item>
            <Form.Item
              name="traceCodeEnd"
              label="追溯码结束"
              rules={[{ required: true, message: '请输入追溯码结束' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：CN2026010015000" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  )
}
