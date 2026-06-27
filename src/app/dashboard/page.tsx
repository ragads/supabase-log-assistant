'use client'

import React, { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/common/Card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { AlertCircle, TrendingUp, Activity, RefreshCw, Wifi, Database, Shield, Zap, Globe } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useDashboard } from '@/hooks/useDashboard'

export default function DashboardPage() {
  const { metrics, errorRateData, severityData, sourcesData, recentLogs, isLoading, isRefreshing, error, lastUpdated, nextRefreshIn, refetch } = useDashboard()
  const [timeRange, setTimeRange] = useState('24h')

  const sourceIcons: Record<string, React.ReactNode> = {
    'api-gateway': <Globe size={16} />,
    'database': <Database size={16} />,
    'auth': <Shield size={16} />,
    'edge-functions': <Zap size={16} />,
  }

  if (error) {
    return (
      <>
        <Header title="Dashboard" subtitle="Real-time overview of your Supabase logs" />
        <div className="p-8">
          <Alert
            type="error"
            title="Failed to Load Dashboard"
            message={error.message}
            closeable
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Real-time overview of your Supabase logs"
        actions={
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="live-pill flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium">
              <span className="live-dot w-2 h-2 rounded-full bg-accent-teal" />
              <Wifi size={12} className="text-accent-teal" />
              <span className="text-accent-teal">Live</span>
              {isRefreshing ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-text-muted">{nextRefreshIn}s</span>
              )}
            </div>
            {lastUpdated && (
              <span className="text-xs text-text-muted hidden lg:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button size="sm" variant="secondary" onClick={refetch}>
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>

        {isLoading && !metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6 h-24 flex items-center justify-center">
                <Spinner size="md" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Quick Stats - 4 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Logs"
                value={metrics?.totalLogs.toLocaleString() || '0'}
                change={`${metrics?.totalLogsChange && metrics.totalLogsChange > 0 ? '+' : ''}${metrics?.totalLogsChange || 0}%`}
                changeType={metrics?.totalLogsChange && metrics.totalLogsChange > 0 ? 'increase' : 'decrease'}
                icon={<Activity size={24} />}
              />
              <MetricCard
                title="Critical Errors"
                value={metrics?.criticalErrors.toLocaleString() || '0'}
                change={`${metrics?.criticalErrorsChange && metrics.criticalErrorsChange > 0 ? '+' : ''}${metrics?.criticalErrorsChange || 0}%`}
                changeType={metrics?.criticalErrorsChange && metrics.criticalErrorsChange > 0 ? 'increase' : 'decrease'}
                icon={<AlertCircle size={24} />}
              />
              <MetricCard
                title="Warnings"
                value={metrics?.warnings.toLocaleString() || '0'}
                change={`${metrics?.warningsChange && metrics.warningsChange > 0 ? '+' : ''}${metrics?.warningsChange || 0}%`}
                changeType={metrics?.warningsChange && metrics.warningsChange > 0 ? 'increase' : 'decrease'}
                icon={<AlertCircle size={24} />}
              />
              <MetricCard
                title="Error Rate"
                value={`${metrics?.errorRate?.toFixed(2) || '0.00'}%`}
                change="Last 24h"
                changeType="neutral"
                icon={<TrendingUp size={24} />}
              />
            </div>

            {/* Charts Section - 2 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Error Rate Chart */}
              <Card className="p-6" hoverable>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">Error Rate ({timeRange})</h3>
                  <Badge variant="info">Last {timeRange}</Badge>
                </div>
                {errorRateData && errorRateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={errorRateData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="errorRateGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(6,13,26,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', backdropFilter: 'blur(16px)', color: '#f1f5f9', fontSize: 12 }}
                        cursor={{ stroke: 'rgba(6,182,212,0.4)', strokeWidth: 1, strokeDasharray: '4 2' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} fill="url(#errorRateGrad)"
                        dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: 'rgba(16,185,129,0.3)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-text-muted text-sm">No data available</div>
                )}
              </Card>

              {/* Severity Distribution */}
              <Card className="p-6" hoverable>
                <h3 className="text-lg font-semibold text-text-primary mb-4">Log Severity Distribution</h3>
                {severityData && severityData.length > 0 ? (
                  <>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={severityData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                            {severityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'rgba(6,13,26,0.9)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#f1f5f9', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center total */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-text-primary">{severityData.reduce((a, b) => a + b.value, 0)}</p>
                          <p className="text-xs text-text-muted">Logs</p>
                        </div>
                      </div>
                    </div>
                    {/* Legend with percentages */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {severityData.map((item) => {
                        const total = severityData.reduce((a, b) => a + b.value, 0)
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                        return (
                          <div key={item.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: `${item.color}12` }}>
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-text-secondary flex-1">{item.name}</span>
                            <span className="text-xs font-bold" style={{ color: item.color }}>{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-text-muted text-sm">No data available</div>
                )}
              </Card>
            </div>

            {/* Log Sources Distribution - Source Cards */}
            <Card className="p-6" hoverable>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">Log Sources Distribution</h3>
                <span className="source-total-badge text-xs text-text-muted px-3 py-1 rounded-full">
                  {sourcesData?.reduce((a, b) => a + b.count, 0) || 0} total logs
                </span>
              </div>
              {sourcesData && sourcesData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const total = sourcesData.reduce((a, b) => a + b.count, 0)
                    const palette = ['#10b981', '#06b6d4', '#8b5cf6', '#f97316', '#3b82f6', '#ec4899']
                    return sourcesData.map((source, idx) => {
                      const pct = total > 0 ? Math.round((source.count / total) * 100) : 0
                      const color = palette[idx % palette.length]
                      return (
                        <div key={source.name} className="source-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wider truncate">{source.name}</span>
                            <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>{pct}%</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary mb-4">{source.count}</p>
                          <div className="progress-track h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
                          </div>
                          <p className="text-xs text-text-muted mt-2">logs recorded</p>
                        </div>
                      )
                    })
                  })()}
                </div>
              ) : (
                <div className="h-[120px] flex flex-col items-center justify-center text-text-muted gap-2">
                  <Activity size={24} className="opacity-40" />
                  <span className="text-sm">No source data available</span>
                </div>
              )}
            </Card>

            {/* Recent Logs Table */}
            <Card className="p-6" hoverable>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">
                  Recent Critical Logs
                </h3>
              </div>
              <div className="overflow-x-auto">
                {recentLogs && recentLogs.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="glass-table-header-row">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Time</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Severity</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Source</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log, idx) => (
                        <tr
                          key={idx}
                          className="glass-table-row glass-table-body-row transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 text-text-muted text-xs font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                log.severity === 'CRITICAL' || log.severity === 'ERROR'
                                  ? 'danger'
                                  : log.severity === 'WARNING'
                                  ? 'warning'
                                  : 'info'
                              }
                            >
                              {log.severity}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-text-secondary text-xs">{log.source}</td>
                          <td className="py-3 px-4 text-text-secondary truncate max-w-xs text-xs">
                            {log.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-text-muted">
                    No logs available
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
