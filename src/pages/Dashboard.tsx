import { useMemo } from 'react'
import { Card, Row, Col, Table, Tag, Button, Space, Progress, Typography, Statistic } from 'antd'
import {
  MedicineBoxOutlined,
  DatabaseOutlined,
  InboxOutlined,
  HomeOutlined,
  TruckOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '@/store'
import type { AlarmRecord, ColdStorage } from '@/types'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

const getStatusColor = (status: ColdStorage['status']) => {
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

export default function Dashboard() {
  const { vaccines, vaccineBatches, coldStorages, transportRecords, alarmRecords } = useAppStore()

  const stats = useMemo(() => {
    const vaccineCount = vaccines.length
    const batchCount = vaccineBatches.length
    const totalStock = vaccineBatches.reduce((sum, batch) => sum + batch.quantity, 0)
    const coldStorageCount = coldStorages.length
    const inTransitCount = transportRecords.filter(t => t.status === 'transporting').length
    const pendingAlarmCount = alarmRecords.filter(a => a.status !== 'resolved').length
    const nearExpireCount = vaccineBatches.filter(b => b.status === 'nearExpire').length
    const expiredCount = vaccineBatches.filter(b => b.status === 'expired').length

    return {
      vaccineCount,
      batchCount,
      totalStock,
      coldStorageCount,
      inTransitCount,
      pendingAlarmCount,
      nearExpireCount,
      expiredCount
    }
  }, [vaccines, vaccineBatches, coldStorages, transportRecords, alarmRecords])

  const stockChartOption = useMemo(() => {
    const vaccineStockMap = new Map<string, number>()
    vaccineBatches.forEach(batch => {
      const current = vaccineStockMap.get(batch.vaccineName) || 0
      vaccineStockMap.set(batch.vaccineName, current + batch.quantity)
    })

    const vaccineNames = Array.from(vaccineStockMap.keys())
    const stockQuantities = Array.from(vaccineStockMap.values())

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: vaccineNames,
        axisLabel: {
          rotate: 30,
          interval: 0,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        name: '数量（支）',
        nameTextStyle: {
          padding: [0, 40, 0, 0]
        }
      },
      series: [
        {
          name: '库存数量',
          type: 'bar',
          data: stockQuantities,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1890ff' },
                { offset: 1, color: '#69c0ff' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: '{c}'
          }
        }
      ]
    }
  }, [vaccineBatches])

  const alarmColumns: ColumnsType<AlarmRecord> = [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 120
    },
    {
      title: '报警类型',
      dataIndex: 'alarmType',
      key: 'alarmType',
      width: 100,
      render: (type: AlarmRecord['alarmType']) => getAlarmTypeText(type)
    },
    {
      title: '级别',
      dataIndex: 'alarmLevel',
      key: 'alarmLevel',
      width: 80,
      render: (level: AlarmRecord['alarmLevel']) => (
        <Tag color={getAlarmLevelColor(level)}>
          {level === 'critical' ? '严重' : '警告'}
        </Tag>
      )
    },
    {
      title: '时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AlarmRecord['status']) => (
        <Tag color={getAlarmStatusColor(status)}>
          {getAlarmStatusText(status)}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: () => (
        <Button type="link" size="small" icon={<EyeOutlined />}>
          查看
        </Button>
      )
    }
  ]

  const latestAlarms = useMemo(() => {
    return [...alarmRecords]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 5)
  }, [alarmRecords])

  const statCards = [
    {
      title: '疫苗品种数',
      value: stats.vaccineCount,
      suffix: '种',
      icon: <MedicineBoxOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      color: '#e6f7ff'
    },
    {
      title: '批次总数',
      value: stats.batchCount,
      suffix: '批',
      icon: <DatabaseOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      color: '#f6ffed'
    },
    {
      title: '库存总量',
      value: stats.totalStock.toLocaleString(),
      suffix: '支',
      icon: <InboxOutlined style={{ fontSize: '32px', color: '#722ed1' }} />,
      color: '#f9f0ff'
    },
    {
      title: '冷库数量',
      value: stats.coldStorageCount,
      suffix: '个',
      icon: <HomeOutlined style={{ fontSize: '32px', color: '#13c2c2' }} />,
      color: '#e6fffb'
    },
    {
      title: '在途运输',
      value: stats.inTransitCount,
      suffix: '车次',
      icon: <TruckOutlined style={{ fontSize: '32px', color: '#fa8c16' }} />,
      color: '#fff7e6'
    },
    {
      title: '待处理报警',
      value: stats.pendingAlarmCount,
      suffix: '条',
      icon: <WarningOutlined style={{ fontSize: '32px', color: '#f5222d' }} />,
      color: '#fff1f0'
    },
    {
      title: '近效期批次',
      value: stats.nearExpireCount,
      suffix: '批',
      icon: <ClockCircleOutlined style={{ fontSize: '32px', color: '#faad14' }} />,
      color: '#fffbe6'
    },
    {
      title: '过期批次',
      value: stats.expiredCount,
      suffix: '批',
      icon: <ExclamationCircleOutlined style={{ fontSize: '32px', color: '#eb2f96' }} />,
      color: '#fff0f6'
    }
  ]

  return (
    <div style={{ padding: '0' }}>
      <Title level={4} style={{ marginBottom: '20px' }}>系统概览</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {statCards.map((card, index) => (
          <Col xs={12} sm={12} md={8} lg={6} xl={6} key={index}>
            <Card
              style={{
                background: card.color,
                borderRadius: '8px',
                border: 'none'
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Statistic
                  title={card.title}
                  value={card.value}
                  suffix={card.suffix}
                  valueStyle={{ fontSize: '24px', fontWeight: 600 }}
                />
                {card.icon}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={5} style={{ marginBottom: '16px', marginTop: '8px' }}>冷库实时温度监控</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {coldStorages.map((storage) => (
          <Col xs={24} sm={12} md={8} lg={8} xl={8} key={storage.id}>
            <Card
              style={{
                borderRadius: '8px',
                borderLeft: `4px solid ${
                  storage.status === 'normal' ? '#52c41a' :
                  storage.status === 'warning' ? '#faad14' : '#f5222d'
                }`
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    {storage.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {storage.location}
                  </div>
                </div>
                <Tag color={getStatusColor(storage.status)}>
                  {getStatusText(storage.status)}
                </Tag>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#1890ff' }}>
                  {storage.currentTemp}
                </span>
                <span style={{ fontSize: '16px', color: '#666' }}>℃</span>
              </div>

              <Progress
                percent={((storage.currentTemp - storage.targetTempMin) / (storage.targetTempMax - storage.targetTempMin)) * 100}
                showInfo={false}
                strokeColor={
                  storage.status === 'normal' ? '#52c41a' :
                  storage.status === 'warning' ? '#faad14' : '#f5222d'
                }
                style={{ marginBottom: '8px' }}
              />

              <div style={{ fontSize: '12px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                <span>温度范围: {storage.targetTempMin}~{storage.targetTempMax}℃</span>
                <span>容量: {storage.capacity.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                更新时间: {storage.lastUpdate}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#f5222d' }} />
                <span>最新报警记录</span>
              </Space>
            }
            extra={<Button type="link">查看全部</Button>}
            style={{ borderRadius: '8px' }}
          >
            <Table
              columns={alarmColumns}
              dataSource={latestAlarms}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 640 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <InboxOutlined style={{ color: '#1890ff' }} />
                <span>疫苗库存统计</span>
              </Space>
            }
            style={{ borderRadius: '8px' }}
          >
            <ReactECharts
              option={stockChartOption}
              style={{ height: '350px', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
