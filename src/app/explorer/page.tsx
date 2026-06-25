'use client'

import React, { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { Checkbox } from '@/components/common/Checkbox'
import { Drawer } from '@/components/common/Drawer'
import { Table } from '@/components/common/Table'
import { CodeBlock } from '@/components/common/CodeBlock'
import { Spinner } from '@/components/common/Spinner'
import {
  Search,
  ChevronDown,
  Download,
  Copy,
  Filter,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useLogs } from '@/hooks/useLogs'

export default function ExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    severity: [] as string[],
    source: [] as string[],
    timeRange: '24h',
    limit: 50,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)

  const { logs, isLoading, error, total, setFilters: updateFilters } = useLogs({
    ...filters,
    search: searchTerm,
  })

  const severityOptions = [
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'ERROR', label: 'Error' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'INFO', label: 'Info' },
  ]

  const sourceOptions = [
    { value: 'postgres', label: 'Postgres' },
    { value: 'auth', label: 'Auth' },
    { value: 'edge-functions', label: 'Edge Functions' },
    { value: 'api-gateway', label: 'API Gateway' },
  ]

  const timeRangeOptions = [
    { value: '1h', label: 'Last 1 Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
  ]

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    updateFilters({ ...filters, search: e.target.value })
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    updateFilters({ ...newFilters, search: searchTerm })
  }

  const handleClearFilters = () => {
    const defaultFilters = {
      severity: [],
      source: [],
      timeRange: '24h',
      limit: 50,
    }
    setFilters(defaultFilters)
    setSearchTerm('')
    updateFilters({ ...defaultFilters, search: '' })
  }

  const handleExport = () => {
    const csv = [
      ['Time', 'Severity', 'Source', 'Message'],
      ...logs.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.severity,
        log.source,
        log.message,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const tableColumns = [
    {
      key: 'timestamp',
      label: 'Time',
      render: (value: any) => new Date(value).toLocaleString(),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (value: any) => (
        <Badge
          variant={
            value === 'CRITICAL' || value === 'ERROR'
              ? 'error'
              : value === 'WARNING'
              ? 'warning'
              : 'info'
          }
        >
          {value}
        </Badge>
      ),
    },
    { key: 'source', label: 'Source' },
    {
      key: 'message',
      label: 'Message',
      render: (value: any) => (
        <span className="truncate max-w-xs block">{value}</span>
      ),
    },
  ]

  const activeFilterCount =
    filters.severity.length + filters.source.length + (searchTerm ? 1 : 0)

  return (
    <>
      <Header
        title="Log Explorer"
        subtitle="Advanced search and filtering of your logs"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleExport}>
              <Download size={18} />
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Search Bar */}
        <Card className="p-4">
          <Input
            placeholder="Search logs by message, source, or content..."
            icon={<Search size={18} />}
            value={searchTerm}
            onChange={handleSearchChange}
            className="mb-4"
          />

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              size="sm"
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-accent-red px-2 py-0.5 rounded-full text-xs text-text-primary">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Select
              options={timeRangeOptions}
              value={filters.timeRange}
              onChange={(value) => handleFilterChange('timeRange', value)}
            />

            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearFilters}
              >
                <X size={18} />
                Clear All
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-dark-border space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Severity
                </label>
                <div className="flex flex-wrap gap-4">
                  {severityOptions.map((option) => (
                    <Checkbox
                      key={option.value}
                      label={option.label}
                      checked={filters.severity.includes(option.value)}
                      onChange={(e) => {
                        const newSeverity = e.target.checked
                          ? [...filters.severity, option.value]
                          : filters.severity.filter((s) => s !== option.value)
                        handleFilterChange('severity', newSeverity)
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Log Source
                </label>
                <div className="flex flex-wrap gap-4">
                  {sourceOptions.map((option) => (
                    <Checkbox
                      key={option.value}
                      label={option.label}
                      checked={filters.source.includes(option.value)}
                      onChange={(e) => {
                        const newSource = e.target.checked
                          ? [...filters.source, option.value]
                          : filters.source.filter((s) => s !== option.value)
                        handleFilterChange('source', newSource)
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Logs Per Page
                </label>
                <Select
                  options={[
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                  ]}
                  value={filters.limit}
                  onChange={(value) => handleFilterChange('limit', value)}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Logs Table */}
        <Card className="p-6">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Spinner size="md" text="Loading logs..." />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto mb-2 text-accent-red" size={32} />
              <p className="text-text-secondary">Failed to load logs</p>
              <p className="text-text-muted text-sm mt-1">{error.message}</p>
            </div>
          ) : (
            <>
              <Table
                columns={tableColumns}
                data={logs}
                onRowClick={(log) => {
                  setSelectedLog(log)
                  setShowDetail(true)
                }}
                highlightedRow={(log) => selectedLog?.id === log.id}
              />
              <div className="mt-4 text-sm text-text-secondary">
                Showing {logs.length} of {total} logs
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Detail Drawer */}
      <Drawer
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Log Details"
        size="lg"
        position="right"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-muted uppercase">Timestamp</p>
                <p className="text-text-primary font-medium">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase mb-1">Severity</p>
                <Badge
                  variant={
                    selectedLog.severity === 'CRITICAL' ||
                    selectedLog.severity === 'ERROR'
                      ? 'error'
                      : selectedLog.severity === 'WARNING'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {selectedLog.severity}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase">Source</p>
                <p className="text-text-primary font-medium">{selectedLog.source}</p>
              </div>
            </div>

            <div className="border-t border-dark-border pt-4">
              <p className="text-xs text-text-muted uppercase mb-2">Message</p>
              <p className="text-text-secondary text-sm font-mono whitespace-pre-wrap bg-dark-surface-dark/50 p-3 rounded border border-dark-border/50">
                {selectedLog.message}
              </p>
            </div>

            {/* JSON View */}
            {selectedLog.metadata && (
              <div className="border-t border-dark-border pt-4">
                <p className="text-xs text-text-muted uppercase mb-2">Additional Metadata</p>
                <CodeBlock
                  code={JSON.stringify(selectedLog.metadata, null, 2)}
                  language="json"
                  copyable
                />
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-dark-border pt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2))
                }}
              >
                <Copy size={18} />
                Copy Full JSON
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
