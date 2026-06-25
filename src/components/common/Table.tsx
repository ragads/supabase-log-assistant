import React from 'react'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  onRowClick?: (row: T) => void
  highlightedRow?: (row: T) => boolean
  pagination?: {
    current: number
    total: number
    pageSize: number
    onChange: (page: number) => void
  }
}

export const Table = React.forwardRef<
  HTMLTableElement,
  TableProps<any>
>(
  (
    {
      data,
      columns,
      isLoading,
      onRowClick,
      highlightedRow,
      pagination,
    },
    ref
  ) => {
    return (
      <div className="overflow-x-auto">
        <table ref={ref} className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border bg-dark-surface-dark/50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`text-left py-3 px-4 font-semibold text-text-secondary ${
                    col.className || ''
                  } ${col.sortable ? 'cursor-pointer hover:text-text-primary' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center">
                  <div className="inline-block animate-spin text-accent-teal">⟳</div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-text-muted">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-dark-border/50 transition-colors ${
                    highlightedRow?.(row) ? 'bg-dark-surface-dark' : 'hover:bg-dark-surface-dark'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`py-3 px-4 text-text-secondary ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] || '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination && (
          <div className="flex items-center justify-between py-4 px-4 border-t border-dark-border">
            <div className="text-sm text-text-secondary">
              Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => pagination.onChange(pagination.current - 1)}
                disabled={pagination.current === 1}
                className="px-3 py-1 text-sm rounded border border-dark-border hover:border-accent-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => pagination.onChange(pagination.current + 1)}
                disabled={
                  pagination.current >=
                  Math.ceil(pagination.total / pagination.pageSize)
                }
                className="px-3 py-1 text-sm rounded border border-dark-border hover:border-accent-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

Table.displayName = 'Table'
