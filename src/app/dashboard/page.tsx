'use client'

import React, { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/common/Card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { AlertCircle, TrendingUp, Activity, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { useDashboard } from '@/hooks/useDashboard'

export default function DashboardPage() {
  const { metrics, errorRateData, severityData, sourcesData, recentLogs, isLoading, error, refetch } = useDashboard()
  const [timeRange, setTimeRange] = useState('24h')

  const handleRefresh = () => {
    refetch()
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
          <Button size="sm" variant="secondary" onClick={handleRefresh}>
            <RefreshCw size={18} />
            Refresh
          </Button>
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
                  <h3 className="text-lg font-semibold text-text-primary">
                    Error Rate ({timeRange})
                  </h3>
                  <Badge variant="info">Last {timeRange}</Badge>
                </div>
                {errorRateData && errorRateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={errorRateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-dark-border)" />
                      <XAxis dataKey="time" stroke="var(--color-text-muted)" />
                      <YAxis stroke="var(--color-text-muted)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-dark-surface)',
                          border: '1px solid var(--color-dark-border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                        cursor={{ stroke: 'var(--color-accent-teal)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-accent-cyan)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--color-accent-teal)', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-text-muted">
                    No data available
                  </div>
                )}
              </Card>

              {/* Severity Distribution */}
              <Card className="p-6" hoverable>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Log Severity Distribution
                  </h3>
                </div>
                {severityData && severityData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-dark-surface)',
                            border: '1px solid var(--color-dark-border)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {severityData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-xs text-text-secondary">
                            {item.name} ({item.value})
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-text-muted">
                    No data available
                  </div>
                )}
              </Card>
            </div>

            {/* Log Sources Distribution */}
            <Card className="p-6" hoverable>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Log Sources Distribution
              </h3>
              {sourcesData && sourcesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sourcesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-dark-border)" />
                    <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                    <YAxis stroke="var(--color-text-muted)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-dark-surface)',
                        border: '1px solid var(--color-dark-border)',
                      }}
                    />
                    <Bar dataKey="count" fill="var(--color-accent-teal)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-text-muted">
                  No data available
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
                      <tr className="border-b border-dark-border">
                        <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                          Time
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                          Severity
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                          Source
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-dark-border/50 hover:bg-dark-surface-dark transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 text-text-primary">
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
                          <td className="py-3 px-4 text-text-secondary">{log.source}</td>
                          <td className="py-3 px-4 text-text-secondary truncate max-w-xs">
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
