import React from 'react'
import { Card } from '@/components/common/Card'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
  accent?: 'teal' | 'red' | 'orange' | 'purple'
  subtitle?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  accent = 'teal',
  subtitle,
}) => {
  const changeStyles = {
    increase: 'text-accent-red',
    decrease: 'text-accent-green',
    neutral: 'text-text-muted',
  }
  const changeSymbol = { increase: '↑', decrease: '↓', neutral: '' }
  return (
    <Card className={`p-5 metric-card-${accent} hover:shadow-[0_0_24px_rgba(16,185,129,0.12)] transition-all duration-300`} hoverable>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{title}</p>
          <p className="text-3xl font-bold text-text-primary leading-none truncate">{value}</p>
          {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
          {change && (
            <p className={`text-xs mt-2 font-semibold ${changeStyles[changeType]}`}>
              {changeSymbol[changeType]} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={`metric-icon-${accent} flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
