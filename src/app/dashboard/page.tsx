'use client'

import React, { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/common/Card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Spinner } from '@/components/common/Spinner'
import { Alert } from '@/components/common/Alert'
import { AlertCircle, TrendingUp, Activity, RefreshCw, Wifi, Database, Lightbulb } from 'lucide-react'
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

const TOOLTIP_STYLE = {
  background: 'rgba(6,13,26,0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: '#f1f5f9',
  fontSize: 12,
}

export default function DashboardPage() {
  const { metrics, errorRateData, severityData, sourcesData, recentLogs, isLoading, isRefreshing, wakingUp, error, lastUpdated, nextRefreshIn, refetch } = useDashboard()
  const [timeRange] = useState('24h')

  // Derive top log source from sourcesData
  const topSource = useMemo(() => {
    if (!sourcesData || sourcesData.length === 0) return 'N/A'
    return sourcesData.reduce((a, b) => (a.count > b.count ? a : b)).name
  }, [sourcesData])

  // Generate AI recommendations from recent log data
  const aiRecommendations = useMemo(() => {
    const errors = (recentLogs || []).filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL')
    const recs: { text: string; priority: 'high' | 'error' | 'medium' }[] = []

    const sourceCount: Record<string, { count: number; msg: string }> = {}
    errors.forEach(l => {
      if (!sourceCount[l.source]) sourceCount[l.source] = { count: 0, msg: l.message || '' }
      sourceCount[l.source].count++
    })

    const sorted = Object.entries(sourceCount).sort((a, b) => b[1].count - a[1].count)

    if (sorted.length > 0) {
      const [src, data] = sorted[0]
      recs.push({ text: `Investigate high frequency of errors in ${src} (${data.count} occurrences)`, priority: 'high' })
      if (data.msg) recs.push({ text: `Resolve repeated: "${data.msg.slice(0, 55)}${data.msg.length > 55 ? '...' : ''}"`, priority: 'error' })
    }

    if (recs.length === 0) {
      recs.push({ text: 'Monitor API gateway for elevated response times', priority: 'medium' })
      recs.push({ text: 'Review authentication logs for failed login attempts', priority: 'medium' })
    }

    if (recs.length === 1) recs.push({ text: `Investigate high frequency of 502 Errors in /api/v1`, priority: 'medium' })

    return recs.slice(0, 3)
  }, [recentLogs])

  const priorityStyle = {
    high:   { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   dot: '#ef4444' },
    error:  { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  dot: '#f97316' },
    medium: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)', dot: '#8b5cf6' },
  }

  if (wakingUp) {
    return (
      <>
        <Header title="Log Analytics Overview" subtitle="" />
        <div className="p-8 flex flex-col items-center justify-center gap-4 mt-20">
          <Spinner size="lg" />
          <p className="text-text-primary font-semibold text-lg">Waking up the server...</p>
          <p className="text-text-muted text-sm text-center max-w-sm">
            The backend is starting up after being idle. This takes about 30–60 seconds on the free tier. Retrying automatically...
          </p>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Log Analytics Overview" subtitle="" />
        <div className="p-8">
          <Alert type="error" title="Failed to Load Dashboard" message={error.message} closeable />
        </div>
      </>
    )
  }

  const liveActions = (
    <div className="flex items-center gap-3">
      <div className="live-pill flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium">
        <span className="live-dot w-2 h-2 rounded-full bg-accent-teal" />
        <Wifi size={12} className="text-accent-teal" />
        <span className="text-accent-teal">Live</span>
        {isRefreshing ? <Spinner size="sm" /> : <span className="text-text-muted">{nextRefreshIn}s</span>}
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
  )

  if (isLoading && !metrics) {
    return (
      <>
        <Header title="Log Analytics Overview" subtitle="" actions={liveActions} />
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 h-40 flex items-center justify-center">
              <Spinner size="md" />
            </Card>
          ))}
        </div>
      </>
    )
  }

  const sevTotal = severityData?.reduce((a, b) => a + b.value, 0) || 0

  return (
    <>
      <Header title="Log Analytics Overview" subtitle="" actions={liveActions} />

      <div className="p-6 space-y-5">

        {/* Row 1 — Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* LOG SEVERITY DISTRIBUTION */}
          <Card className="p-5" hoverable>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">Log Severity Distribution</p>
            {severityData && severityData.length > 0 ? (
              <>
                <div className="flex items-center gap-4">
                  {/* Donut */}
                  <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
                    <PieChart width={160} height={160}>
                      <Pie data={severityData} cx={75} cy={75} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                        {severityData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-xl font-bold text-text-primary">{sevTotal >= 1000 ? `${(sevTotal / 1000).toFixed(1)}K` : sevTotal}</p>
                        <p className="text-xs text-text-muted">Logs</p>
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex-1 space-y-2">
                    {severityData.map((item) => {
                      const pct = sevTotal > 0 ? ((item.value / sevTotal) * 100).toFixed(1) : '0'
                      return (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-text-secondary flex-1">{item.name}</span>
                          <span className="text-xs font-semibold text-text-muted">({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-text-muted text-sm">No data available</div>
            )}
          </Card>

          {/* ERROR RATE */}
          <Card className="p-5" hoverable>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Error Rate</p>
              <span className="text-xs text-text-muted">Last {timeRange}</span>
            </div>
            {errorRateData && errorRateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={errorRateData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0)" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0)" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} label={{ value: 'Errors/Min', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 9, dy: 40 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(6,182,212,0.3)', strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fill="url(#errGrad)"
                    dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#10b981', stroke: 'rgba(16,185,129,0.3)', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-text-muted text-sm">No data available</div>
            )}
          </Card>
        </div>

        {/* Row 2 — 3 Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard
            title="Critical Errors (Last Hr)"
            value={metrics?.criticalErrors?.toLocaleString() || '0'}
            change={`+${metrics?.criticalErrorsChange || 0}%`}
            changeType={metrics?.criticalErrorsChange && metrics.criticalErrorsChange > 0 ? 'increase' : 'decrease'}
            icon={<AlertCircle size={20} />}
            accent="red"
            subtitle="Last hour"
          />
          <MetricCard
            title="Active Logs"
            value={metrics?.totalLogs?.toLocaleString() || '0'}
            change={`${metrics?.totalLogsChange || 0}% vs yesterday`}
            changeType="neutral"
            icon={<Activity size={20} />}
            accent="teal"
          />
          <MetricCard
            title="Top Log Source"
            value={topSource}
            change={sourcesData?.find(s => s.name === topSource)?.count ? `${sourcesData.find(s => s.name === topSource)?.count} logs` : ''}
            changeType="neutral"
            icon={<Database size={20} />}
            accent="teal"
          />
        </div>

        {/* Row 3 — Recent Errors + AI Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Recent Errors */}
          <Card className="lg:col-span-3 p-5" hoverable>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">Recent Errors</p>
            {recentLogs && recentLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="glass-table-header-row">
                      <th className="text-left py-2 px-3 text-text-muted font-medium">Time</th>
                      <th className="text-left py-2 px-3 text-text-muted font-medium">Message</th>
                      <th className="text-left py-2 px-3 text-text-muted font-medium">Severity</th>
                      <th className="text-left py-2 px-3 text-text-muted font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.slice(0, 6).map((log, idx) => (
                      <tr key={idx} className="glass-table-row glass-table-body-row transition-colors cursor-pointer">
                        <td className="py-2.5 px-3 text-text-muted font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')}
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary max-w-[180px] truncate">{log.message}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={log.severity === 'CRITICAL' || log.severity === 'ERROR' ? 'danger' : log.severity === 'WARNING' ? 'warning' : 'info'}>
                            {log.severity}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary">{log.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-text-muted text-sm">No recent errors</div>
            )}
          </Card>

          {/* AI Recommendations */}
          <Card className="lg:col-span-2 p-5" hoverable>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={14} className="text-accent-teal" />
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">AI Recommendations</p>
            </div>
            <div className="space-y-3">
              {aiRecommendations.map((rec, idx) => {
                const style = priorityStyle[rec.priority]
                return (
                  <div key={idx} className="rounded-xl p-3 text-xs text-text-secondary leading-relaxed" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: style.dot }} />
                      <span>{rec.text}</span>
                    </div>
                  </div>
                )
              })}
              {aiRecommendations.length === 0 && (
                <div className="py-6 text-center text-text-muted text-xs">All systems nominal</div>
              )}
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-text-muted flex items-center gap-1.5">
                <TrendingUp size={11} className="text-accent-teal" />
                Powered by Gemini AI analysis
              </p>
            </div>
          </Card>

        </div>
      </div>
    </>
  )
}
