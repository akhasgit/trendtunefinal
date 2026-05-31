import React from 'react'
import { ActionDocument, ActionType } from '../../types/actions'
import { getActionBadgeColor, formatActionType } from '../../utils/actionDisplay'

interface ActionPillProps {
  action: ActionDocument
}

const ACTION_PILL_TOOLTIPS: Record<ActionType, string> = {
  marketing_plan: 'A comprehensive marketing strategy tailored for this product, including target audience, messaging, and channels.',
  stock_plan: 'Inventory optimization recommendations to ensure the right stock levels for this product.',
  trend_match: 'This product matches with one or more current market trends, offering high alignment potential.',
  trend_gap: 'This product is missing alignment with key trends—opportunities exist to improve relevance.',
  adaptation_recommendation: 'Strategic suggestions to adapt or modify this product for better market fit.',
  improvement_task: 'Specific actionable tasks to enhance this product\'s performance or appeal.',
  trend_opportunity: 'A market trend not currently addressed by your catalog—potential for new product development.',
  global_sku_suggestion: 'A new product idea or SKU recommended for your catalog based on market analysis.',
  global_sku_suggestion_legacy: 'A new product suggestion based on market analysis (legacy format).'
}

const ActionPill: React.FC<ActionPillProps> = ({ action }) => {
  return (
    <span
      className={`px-3 py-1 rounded-full font-medium transition ${getActionBadgeColor(action.action_type)}`}
      title={ACTION_PILL_TOOLTIPS[action.action_type] || ''}
    >
      {formatActionType(action.action_type)}
    </span>
  )
}

export default ActionPill 