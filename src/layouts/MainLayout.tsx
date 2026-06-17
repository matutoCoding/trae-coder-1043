import { useState } from 'react'
import { Layout, Menu, theme, Badge, Avatar, Dropdown } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  BookOutlined,
  InboxOutlined,
  TruckOutlined,
  FireOutlined,
  MedicineBoxOutlined,
  WarningOutlined,
  BarChartOutlined,
  UserOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useAppStore } from '@/store'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '系统首页' },
  { key: '/vaccine-ledger', icon: <BookOutlined />, label: '疫苗台账' },
  { key: '/stock-in-out', icon: <InboxOutlined />, label: '入库出库' },
  { key: '/cold-chain-transport', icon: <TruckOutlined />, label: '冷链运输' },
  { key: '/temperature-monitor', icon: <FireOutlined />, label: '温度监控' },
  { key: '/vaccination-distribution', icon: <MedicineBoxOutlined />, label: '接种分发' },
  { key: '/expiry-warning', icon: <WarningOutlined />, label: '效期预警' },
  { key: '/trace-statistics', icon: <BarChartOutlined />, label: '追溯统计' },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()
  
  const alarmRecords = useAppStore(state => state.alarmRecords)
  const activeAlarms = alarmRecords.filter(a => a.status !== 'resolved')

  const userMenu = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div className="logo">
          {collapsed ? '疫苗' : '疫苗冷链监管系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 500 }}>
            {menuItems.find(m => m.key === location.pathname)?.label as string}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Badge count={activeAlarms.length} offset={[-2, 2]}>
              <BellOutlined style={{ fontSize: '20px', cursor: 'pointer', color: '#666' }} />
            </Badge>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} size="small" />
                <span>管理员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: '24px',
            minHeight: 'calc(100vh - 112px)',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
