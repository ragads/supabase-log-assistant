import React from 'react'
import { Card } from '@/components/common/Card'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
}) => {
  const changeStyles = {
    increase: 'text-accent-red',
    decrease: 'text-accent-green',
    neutral: 'text-text-secondary',
  }

  const changeSymbol = {
    increase: '↑',
    decrease: '↓',
    neutral: '',
  }

  return (
    <Card className="p-6 hover:shadow-glow" hoverable>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-muted text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
          {change && (
            <p className={`text-xs mt-2 font-medium ${changeStyles[changeType]}`}>
              {changeSymbol[changeType]} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-accent-teal opacity-60 flex-shrink-0">{icon}</div>
        )}
      </div>
    </Card>
  )
}
