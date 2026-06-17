import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Tabs, Table, Button, Form, Input, Select, DatePicker,
  Space, message, Tag, Timeline, Card, Descriptions, Row, Col,
  Statistic, List, Divider, Empty
} from 'antd'
import {
  SearchOutlined, QrcodeOutlined, ClockCircleOutlined,
  WarningOutlined, BarChartOutlined, PieChartOutlined,
  LineChartOutlined, UserOutlined, InboxOutlined,
  EnvironmentOutlined, MedicineBoxOutlined,
  CalendarOutlined, TeamOutlined, ShopOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import type { TraceCodeRecord, ChainBreakEvent, VaccinationStats } from '@/types'

const { Option } = Select
const { RangePicker } = DatePicker

type TabKey = 'traceCodeQuery' | 'chainBreakEvent' | 'vaccinationStats'

const traceStatusTextMap: Record<string, string> = {
  inStock: '在库',
  distributed: '已配送',
  vaccinated: '已接种',
  destroyed: '已销毁'
}

const traceStatusColorMap: Record<string, string> = {
  inStock: 'blue',
  distributed: 'cyan',
  vaccinated: 'green',
  destroyed: 'red'
}

const eventTypeTextMap: Record<string, string> = {
  temperature: '温度异常',
  transport: '运输异常',
  storage: '存储异常',
  other: '其他异常'
}

const eventTypeColorMap: Record<string, string> = {
  temperature: 'red',
  transport: 'orange',
  storage: 'yellow',
  other: 'purple'
}

const eventStatusTextMap: Record<string, string> = {
  investigating: '调查中',
  processing: '处理中',
  closed: '已结案'
}

const eventStatusColorMap: Record<string, string> = {
  investigating: 'orange',
  processing: 'blue',
  closed: 'green'
}

const scanActionColorMap: Record<string, string> = {
  '入库扫描': 'blue',
  '出库扫描': 'orange',
  '配送扫描': 'cyan',
  '接收扫描': 'purple',
  '接种扫描': 'green',
  '入库': 'blue',
  '出库': 'orange',
  '配送': 'cyan',
  '接种': 'green'
}

export default function TraceStatistics() {
  const [activeTab, setActiveTab] = useState<TabKey>('traceCodeQuery')
  const [traceCodeInput, setTraceCodeInput] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<ChainBreakEvent | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [vaccineFilter, setVaccineFilter] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const scanInputRef = useRef<any>(null)

  const {
    traceCodeRecords,
    chainBreakEvents,
    vaccinationStats,
    vaccineBatches,
    vaccines,
    clinics,
    temperatureRecords
  } = useAppStore()

  useEffect(() => {
    if (activeTab === 'traceCodeQuery' && scanInputRef.current) {
      scanInputRef.current.focus()
    }
  }, [activeTab])

  const foundTraceRecord = useMemo(() => {
    if (!traceCodeInput.trim()) return null
    return traceCodeRecords.find(t => t.traceCode === traceCodeInput.trim())
  }, [traceCodeRecords, traceCodeInput])

  const eventList = useMemo(() => {
    return [...chainBreakEvents].sort((a, b) =>
      dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
    )
  }, [chainBreakEvents])

  const vaccineOptions = useMemo(() => {
    const vaccines = [...new Set(vaccinationStats.map(s => s.vaccineName))]
    return vaccines.map(v => ({ label: v, value: v }))
  }, [vaccinationStats])

  const clinicOptions = useMemo(() => {
    return clinics.map(c => ({ label: c.name, value: c.name }))
  }, [clinics])

  const filteredStats = useMemo(() => {
    return vaccinationStats.filter(s => {
      if (dateRange) {
        const statDate = dayjs(s.date)
        if (statDate.isBefore(dateRange[0]) || statDate.isAfter(dateRange[1])) {
          return false
        }
      }
      if (vaccineFilter && s.vaccineName !== vaccineFilter) {
        return false
      }
      if (clinicFilter && s.clinicName !== clinicFilter) {
        return false
      }
      return true
    }).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  }, [vaccinationStats, dateRange, vaccineFilter, clinicFilter])

  const statCards = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    const totalDoses = filteredStats.reduce((sum, s) => sum + s.doses, 0)
    const todayDoses = filteredStats
      .filter(s => s.date === today)
      .reduce((sum, s) => sum + s.doses, 0)
    const avgCoverage = filteredStats.length > 0
      ? filteredStats.reduce((sum, s) => sum + s.coverageRate, 0) / filteredStats.length
      : 0
    const clinicCount = new Set(filteredStats.map(s => s.clinicName)).size

    return { totalDoses, todayDoses, avgCoverage, clinicCount }
  }, [filteredStats])

  const trendChartOption = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) =>
      dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD')
    )
    const dosesByDay = last7Days.map(date => {
      return filteredStats
        .filter(s => s.date === date)
        .reduce((sum, s) => sum + s.doses, 0)
    })

    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: last7Days.map(d => d.slice(5)),
        axisLabel: { fontSize: 12 }
      },
      yAxis: { type: 'value', name: '接种剂次' },
      series: [{
        data: dosesByDay,
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.05)' }
            ]
          }
        },
        lineStyle: { color: '#52c41a', width: 2 },
        itemStyle: { color: '#52c41a' }
      }],
      grid: { left: 50, right: 20, top: 30, bottom: 30 }
    }
  }, [filteredStats])

  const clinicChartOption = useMemo(() => {
    const clinicDoses = new Map<string, number>()
    filteredStats.forEach(s => {
      const current = clinicDoses.get(s.clinicName) || 0
      clinicDoses.set(s.clinicName, current + s.doses)
    })
    const sortedClinics = Array.from(clinicDoses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: sortedClinics.map(c => c[0].replace(/社区卫生服务中心|医院|接种中心|门诊/, '')),
        axisLabel: { fontSize: 10, interval: 0 }
      },
      yAxis: { type: 'value', name: '接种剂次' },
      series: [{
        data: sortedClinics.map(c => c[1]),
        type: 'bar',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#69c0ff' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '50%'
      }],
      grid: { left: 50, right: 20, top: 30, bottom: 40 }
    }
  }, [filteredStats])

  const vaccineChartOption = useMemo(() => {
    const vaccineDoses = new Map<string, number>()
    filteredStats.forEach(s => {
      const current = vaccineDoses.get(s.vaccineName) || 0
      vaccineDoses.set(s.vaccineName, current + s.doses)
    })

    const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96']

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} 剂次 ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: Array.from(vaccineDoses.entries()).map(([name, value], index) => ({
          name, value, itemStyle: { color: colors[index % colors.length] }
        }))
      }]
    }
  }, [filteredStats])

  const tempChartOption = useMemo(() => {
    if (!selectedEvent) return {}

    const eventStartTime = dayjs(selectedEvent.startTime)
    const eventEndTime = selectedEvent.endTime ? dayjs(selectedEvent.endTime) : dayjs()

    const relevantTemps = temperatureRecords
      .filter(t => {
        const recordTime = dayjs(t.recordTime)
        return recordTime.isAfter(eventStartTime.subtract(2, 'hour')) &&
               recordTime.isBefore(eventEndTime.add(2, 'hour'))
      })
      .sort((a, b) => dayjs(a.recordTime).valueOf() - dayjs(b.recordTime).valueOf())

    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: relevantTemps.map(t => t.recordTime.slice(11, 16)),
        axisLabel: { fontSize: 10 }
      },
      yAxis: { type: 'value', name: '温度(℃)', min: 0, max: 15 },
      series: [{
        data: relevantTemps.map(t => t.temperature),
        type: 'line',
        smooth: true,
        lineStyle: { color: '#f5222d', width: 2 },
        itemStyle: { color: '#f5222d' },
        markArea: {
          silent: true,
          data: [[
            { xAxis: selectedEvent.startTime.slice(11, 16), itemStyle: { color: 'rgba(245, 34, 45, 0.1)' } },
            { xAxis: (selectedEvent.endTime || dayjs().format('YYYY-MM-DD HH:mm:ss')).slice(11, 16) }
          ]]
        }
      }],
      grid: { left: 50, right: 20, top: 30, bottom: 30 }
    }
  }, [selectedEvent, temperatureRecords])

  const handleTraceCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (traceCodeInput.trim()) {
        const record = traceCodeRecords.find(t => t.traceCode === traceCodeInput.trim())
        if (!record) {
          message.warning('未找到该追溯码对应的疫苗信息')
        }
      }
    }
  }

  const getBatchInfo = (batchId: string) => {
    const batch = vaccineBatches.find(b => b.id === batchId)
    if (!batch) return null
    const vaccine = vaccines.find(v => v.id === batch.vaccineId)
    return {
      ...batch,
      manufacturer: vaccine?.manufacturer || '-'
    }
  }

  const traceCodeColumns = [
    {
      title: '扫描时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
    },
    {
      title: '地点',
      dataIndex: 'location',
      key: 'location',
      width: 200,
      render: (val: string) => (
        <Space>
          <EnvironmentOutlined />
          {val}
        </Space>
      )
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
      render: (val: string) => (
        <Space>
          <UserOutlined />
          {val}
        </Space>
      )
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (val: string) => (
        <Tag color={scanActionColorMap[val] || 'blue'}>{val}</Tag>
      )
    }
  ]

  const statsColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (val: string) => (
        <Space>
          <CalendarOutlined />
          {val}
        </Space>
      )
    },
    {
      title: '疫苗名称',
      dataIndex: 'vaccineName',
      key: 'vaccineName',
      width: 150,
      render: (val: string) => (
        <Space>
          <MedicineBoxOutlined />
          {val}
        </Space>
      )
    },
    {
      title: '批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 130,
    },
    {
      title: '接种门诊',
      dataIndex: 'clinicName',
      key: 'clinicName',
      width: 200,
      render: (val: string) => (
        <Space>
          <ShopOutlined />
          {val}
        </Space>
      )
    },
    {
      title: '接种剂次',
      dataIndex: 'doses',
      key: 'doses',
      width: 100,
      render: (val: number) => <Tag color="blue">{val} 剂次</Tag>
    },
    {
      title: '目标人群',
      dataIndex: 'population',
      key: 'population',
      width: 120,
      render: (val: string) => (
        <Space>
          <TeamOutlined />
          {val}
        </Space>
      )
    },
    {
      title: '覆盖率',
      dataIndex: 'coverageRate',
      key: 'coverageRate',
      width: 100,
      render: (val: number) => {
        let color = 'green'
        if (val < 80) color = 'red'
        else if (val < 90) color = 'orange'
        return <Tag color={color}>{val.toFixed(1)}%</Tag>
      }
    }
  ]

  const tabItems = [
    {
      key: 'traceCodeQuery',
      label: (
        <Space>
          <QrcodeOutlined />
          电子追溯码查询
        </Space>
      ),
      children: (
        <div>
          <Row gutter={16}>
            <Col span={10}>
              <Card title="追溯码查询" extra={<QrcodeOutlined style={{ fontSize: 24 }} />}>
                <div style={{ marginBottom: 16 }}>
                  <Input
                    ref={scanInputRef}
                    size="large"
                    placeholder="请使用扫码枪扫描追溯码或手动输入"
                    prefix={<SearchOutlined />}
                    value={traceCodeInput}
                    onChange={(e) => setTraceCodeInput(e.target.value)}
                    onKeyDown={handleTraceCodeKeyDown}
                    allowClear
                  />
                  <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                    提示：扫码枪扫描后自动按回车键查询
                  </p>
                </div>

                {foundTraceRecord ? (
                  <div>
                    <Descriptions title="疫苗基本信息" bordered column={1} size="small">
                      <Descriptions.Item label="追溯码">
                        <Tag color="blue">{foundTraceRecord.traceCode}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="疫苗名称">
                        {foundTraceRecord.vaccineName}
                      </Descriptions.Item>
                      <Descriptions.Item label="批号">
                        {foundTraceRecord.batchNo}
                      </Descriptions.Item>
                      <Descriptions.Item label="当前状态">
                        <Tag color={traceStatusColorMap[foundTraceRecord.status]}>
                          {traceStatusTextMap[foundTraceRecord.status]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="当前位置">
                        <Space>
                          <EnvironmentOutlined />
                          {foundTraceRecord.currentLocation}
                        </Space>
                      </Descriptions.Item>
                      {getBatchInfo(foundTraceRecord.batchId) && (
                        <>
                          <Descriptions.Item label="生产厂家">
                            {getBatchInfo(foundTraceRecord.batchId)?.manufacturer || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="有效期">
                            {getBatchInfo(foundTraceRecord.batchId)?.expireDate || '-'}
                          </Descriptions.Item>
                        </>
                      )}
                    </Descriptions>
                  </div>
                ) : traceCodeInput ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <QrcodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>未找到追溯码 "{traceCodeInput}" 对应的疫苗信息</p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    <SearchOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>请扫描或输入追溯码查询疫苗信息</p>
                  </div>
                )}
              </Card>
            </Col>
            <Col span={14}>
              <Card title="追溯链路时间线">
                {foundTraceRecord && foundTraceRecord.scanHistory.length > 0 ? (
                  <Timeline
                    mode="left"
                    items={foundTraceRecord.scanHistory
                      .slice()
                      .reverse()
                      .map((item, index) => ({
                        color: scanActionColorMap[item.action] || 'blue',
                        label: item.time,
                        children: (
                          <div>
                            <p style={{ margin: 0 }}>
                              <Tag color={scanActionColorMap[item.action] || 'blue'}>{item.action}</Tag>
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
                    <p>暂无追溯记录</p>
                  </div>
                )}
              </Card>

              {foundTraceRecord && (
                <Card title="扫描记录详情" style={{ marginTop: 16 }}>
                  <Table
                    columns={traceCodeColumns}
                    dataSource={foundTraceRecord.scanHistory}
                    rowKey={(record, index) => index.toString()}
                    pagination={false}
                    size="small"
                  />
                </Card>
              )}
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'chainBreakEvent',
      label: (
        <Space>
          <WarningOutlined />
          断链事件追溯
        </Space>
      ),
      children: (
        <div>
          <Row gutter={16}>
            <Col span={8}>
              <Card
                title={
                  <Space>
                    <WarningOutlined style={{ color: '#fa8c16' }} />
                    断链事件列表
                    <Tag color="orange">{eventList.length}</Tag>
                  </Space>
                }
                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
              >
                <List
                  dataSource={eventList}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      onClick={() => setSelectedEvent(item)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedEvent?.id === item.id ? '#e6f7ff' : 'transparent',
                        borderRadius: 4,
                        marginBottom: 8,
                        border: selectedEvent?.id === item.id ? '1px solid #91d5ff' : '1px solid transparent'
                      }}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={eventTypeColorMap[item.eventType]}>
                              {eventTypeTextMap[item.eventType]}
                            </Tag>
                            <Tag color={eventStatusColorMap[item.status]}>
                              {eventStatusTextMap[item.status]}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <p style={{ margin: 0, color: '#333' }}>{item.description}</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#999' }}>
                              <ClockCircleOutlined /> {item.startTime}
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#999' }}>
                              <EnvironmentOutlined /> {item.location}
                            </p>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={16}>
              {selectedEvent ? (
                <div>
                  <Card title="事件详情">
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="事件编号">
                        {selectedEvent.id}
                      </Descriptions.Item>
                      <Descriptions.Item label="事件类型">
                        <Tag color={eventTypeColorMap[selectedEvent.eventType]}>
                          {eventTypeTextMap[selectedEvent.eventType]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="发生地点">
                        <Space>
                          <EnvironmentOutlined />
                          {selectedEvent.location}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="当前状态">
                        <Tag color={eventStatusColorMap[selectedEvent.status]}>
                          {eventStatusTextMap[selectedEvent.status]}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="开始时间">
                        {selectedEvent.startTime}
                      </Descriptions.Item>
                      <Descriptions.Item label="结束时间">
                        {selectedEvent.endTime || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="负责人">
                        <Space>
                          <UserOutlined />
                          {selectedEvent.handler}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="涉及批次">
                        {selectedEvent.affectedBatches.join(', ')}
                      </Descriptions.Item>
                      <Descriptions.Item label="事件描述" span={2}>
                        {selectedEvent.description}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {temperatureRecords.length > 0 && (
                    <Card title="温度曲线" style={{ marginTop: 16 }}>
                      <ReactECharts option={tempChartOption} style={{ height: 250 }} />
                    </Card>
                  )}

                  <Card title="涉及疫苗批次" style={{ marginTop: 16 }}>
                    <List
                      dataSource={selectedEvent.affectedBatches}
                      renderItem={(batchId) => {
                        const batch = getBatchInfo(batchId)
                        return (
                          <List.Item key={batchId}>
                            <List.Item.Meta
                              title={batch ? `${batch.vaccineName} - ${batch.batchNo}` : batchId}
                              description={
                                batch ? (
                                  <Space>
                                    <Tag>库存: {batch.quantity}{batch.unit}</Tag>
                                    <Tag color={batch.status === 'normal' ? 'green' : batch.status === 'nearExpire' ? 'orange' : 'red'}>
                                      {batch.status === 'normal' ? '正常' : batch.status === 'nearExpire' ? '临近效期' : batch.status === 'expired' ? '已过期' : '已销毁'}
                                    </Tag>
                                  </Space>
                                ) : '未找到批次信息'
                              }
                            />
                          </List.Item>
                        )
                      }}
                    />
                  </Card>

                  <Card title="处理时间线" style={{ marginTop: 16 }}>
                    <Timeline
                      mode="left"
                      items={[
                        {
                          color: 'red',
                          label: selectedEvent.startTime,
                          children: (
                            <div>
                              <p style={{ margin: 0 }}>
                                <Tag color="red">事件发生</Tag>
                              </p>
                              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                                {selectedEvent.description}
                              </p>
                              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#666' }}>
                                地点：{selectedEvent.location}
                              </p>
                            </div>
                          )
                        },
                        ...(selectedEvent.endTime ? [
                          {
                            color: 'green',
                            label: selectedEvent.endTime,
                            children: (
                              <div>
                                <p style={{ margin: 0 }}>
                                  <Tag color="green">事件结束</Tag>
                                </p>
                                {selectedEvent.result && (
                                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                                    处理结果：{selectedEvent.result}
                                  </p>
                                )}
                              </div>
                            )
                          }
                        ] : [])
                      ]}
                    />
                  </Card>

                  {selectedEvent.result && (
                    <Card title="处理结果与评估报告" style={{ marginTop: 16 }}>
                      <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="处理结果">
                          {selectedEvent.result}
                        </Descriptions.Item>
                        <Descriptions.Item label="评估结论">
                          该事件处理及时，未造成重大影响。涉及的疫苗批次已进行质量评估，
                          合格批次继续使用，不合格批次已按规定销毁。
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 100, color: '#999' }}>
                  <WarningOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <p>请从左侧选择一个事件查看详情</p>
                </div>
              )}
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'vaccinationStats',
      label: (
        <Space>
          <BarChartOutlined />
          接种覆盖统计
        </Space>
      ),
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <MedicineBoxOutlined style={{ color: '#1890ff' }} />
                      总接种剂次
                    </Space>
                  }
                  value={statCards.totalDoses}
                  suffix="剂次"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <CalendarOutlined style={{ color: '#52c41a' }} />
                      今日接种
                    </Space>
                  }
                  value={statCards.todayDoses}
                  suffix="剂次"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <LineChartOutlined style={{ color: '#faad14' }} />
                      平均覆盖率
                    </Space>
                  }
                  value={statCards.avgCoverage}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <ShopOutlined style={{ color: '#722ed1' }} />
                      接种门诊数
                    </Space>
                  }
                  value={statCards.clinicCount}
                  suffix="家"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="筛选条件"
            style={{ marginBottom: 16 }}
            size="small"
          >
            <Space wrap>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                placeholder={['开始日期', '结束日期']}
              />
              <Select
                placeholder="选择疫苗名称"
                value={vaccineFilter || undefined}
                onChange={setVaccineFilter}
                style={{ width: 180 }}
                allowClear
                showSearch
                optionFilterProp="label"
              >
                {vaccineOptions.map(opt => (
                  <Option key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="选择接种门诊"
                value={clinicFilter || undefined}
                onChange={setClinicFilter}
                style={{ width: 250 }}
                allowClear
                showSearch
                optionFilterProp="label"
              >
                {clinicOptions.map(opt => (
                  <Option key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
              <Button
                onClick={() => {
                  setDateRange(null)
                  setVaccineFilter('')
                  setClinicFilter('')
                }}
              >
                重置
              </Button>
            </Space>
          </Card>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card
                title={
                  <Space>
                    <LineChartOutlined />
                    近7天接种趋势
                  </Space>
                }
              >
                <ReactECharts option={trendChartOption} style={{ height: 280 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined />
                    各门诊接种数量对比
                  </Space>
                }
              >
                <ReactECharts option={clinicChartOption} style={{ height: 280 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={10}>
              <Card
                title={
                  <Space>
                    <PieChartOutlined />
                    各疫苗品种接种占比
                  </Space>
                }
              >
                <ReactECharts option={vaccineChartOption} style={{ height: 280 }} />
              </Card>
            </Col>
            <Col span={14}>
              <Card
                title="接种统计说明"
                extra={<Tag color="blue">{filteredStats.length} 条记录</Tag>}
              >
                <Empty
                  description={
                    <div style={{ textAlign: 'left' }}>
                      <p><strong>数据说明：</strong></p>
                      <p>• 统计范围：{dateRange ? `${dateRange[0].format('YYYY-MM-DD')} 至 ${dateRange[1].format('YYYY-MM-DD')}` : '全部数据'}</p>
                      <p>• 疫苗类型：{vaccineFilter || '全部疫苗'}</p>
                      <p>• 接种门诊：{clinicFilter || '全部门诊'}</p>
                      <Divider style={{ margin: '12px 0' }} />
                      <p><strong>指标解释：</strong></p>
                      <p>• 接种剂次：实际接种的疫苗数量</p>
                      <p>• 覆盖率：实际接种人数 / 目标接种人数 × 100%</p>
                      <p>• 目标人群：该疫苗推荐接种的人群类别</p>
                    </div>
                  }
                />
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <Space>
                <BarChartOutlined />
                接种统计明细
                <Tag color="blue">{filteredStats.length} 条记录</Tag>
              </Space>
            }
          >
            <Table
              columns={statsColumns}
              dataSource={filteredStats}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1000 }}
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
    </div>
  )
}
