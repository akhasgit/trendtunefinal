import React from 'react'
import { ActionDocument, FirestoreAction, isNewSchema } from '../../types/actions'
import { generateActionDisplay, getActionIcon, getActionColor } from '../../utils/actionDisplay'
import ActionPill from './ActionPill'

interface ActionCardProps {
  action: ActionDocument | FirestoreAction
  onClick?: () => void
  showProductInfo?: boolean
  showActionType?: boolean
  className?: string
}

const ActionCard: React.FC<ActionCardProps> = ({
  action,
  onClick,
  showProductInfo = true,
  showActionType = true,
  className = ''
}) => {
  const isNewSchemaAction = isNewSchema(action)
  
  // Get display information
  const display = isNewSchemaAction 
    ? generateActionDisplay(action)
    : {
        title: action.title || 'Untitled Action',
        summary: action.summary || 'No summary available',
        details: action.details || 'No details available'
      }
  
  // Get action icon and color
  const icon = isNewSchemaAction ? getActionIcon(action.action_type) : '📋'
  const colorClass = isNewSchemaAction ? getActionColor(action.action_type) : 'from-gray-500 to-gray-600'
  
  // Get creation date
  const getCreatedAt = () => {
    if (isNewSchemaAction) {
      return action.created_at ? new Date(action.created_at).toLocaleDateString() : 'N/A'
    } else {
      try {
        return action.dateSuggested?.toDate?.()?.toLocaleDateString() || 'N/A'
      } catch {
        return 'N/A'
      }
    }
  }
  
  // Get product name
  const getProductName = () => {
    if (isNewSchemaAction && action.product_name) {
      return action.product_name
    }
    return null
  }
  
  const productName = getProductName()
  const createdAt = getCreatedAt()
  
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group ${className}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      aria-label={`Show details for ${display.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{icon}</span>
              {showActionType && isNewSchemaAction && (
                <ActionPill action={action} />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {display.title}
            </h3>
          </div>
        </div>

        {/* Product Info - Only for new schema */}
        {showProductInfo && productName && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-900">{productName}</p>
            {isNewSchemaAction && action.product_description && (
              <p className="text-xs text-blue-700 mt-1 line-clamp-2">
                {action.product_description}
              </p>
            )}
          </div>
        )}

        {/* Summary */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {display.summary}
        </p>

        {/* Details */}
        <div className="mb-4">
          <p className="text-gray-700 text-sm line-clamp-4">
            {display.details}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Created: {createdAt}
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colorClass}`} />
            <span className="text-xs text-gray-500">
              {isNewSchemaAction ? 'New Schema' : 'Legacy'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActionCard 
 