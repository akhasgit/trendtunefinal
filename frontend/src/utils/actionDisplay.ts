import { 
  ActionDocument, 
  ACTION_TYPES, 
  ActionType,
  getTypedPayload,
  TrendMatchPayload,
  TrendGapPayload,
  AdaptationRecommendationPayload,
  MarketingPlanPayload,
  StockPlanPayload,
  ImprovementTaskPayload,
  TrendOpportunityPayload,
  GlobalSkuSuggestionPayload,
  GlobalSkuSuggestionLegacyPayload
} from '../types/actions'

/**
 * Generates display text for actions using the new schema
 */
export const generateActionDisplay = (action: ActionDocument): { 
  title: string; 
  summary: string; 
  details: string 
} => {
  const { action_type, payload, product_name, summary } = action
  
  // Use AI-generated summary if available, otherwise generate one
  const displaySummary = summary || generateSummary(action_type, payload, product_name)
  
  switch (action_type) {
    case ACTION_TYPES.TREND_MATCH: {
      const trendPayload = getTypedPayload<TrendMatchPayload>(action, ACTION_TYPES.TREND_MATCH)
      return {
        title: `Trend Match: ${product_name || "Product"}`,
        summary: displaySummary,
        details: trendPayload ? 
          `Your ${product_name ? product_name.toLowerCase() : "product"} matches the trend "${trendPayload.matched_trend}". ${trendPayload.reason}` :
          "Your product aligns with current market trends."
      }
    }
    
    case ACTION_TYPES.TREND_GAP: {
      const gapPayload = getTypedPayload<TrendGapPayload>(action, ACTION_TYPES.TREND_GAP)
      return {
        title: `Address Trend Gap`,
        summary: displaySummary,
        details: gapPayload ? 
          `Nearest trend: ${gapPayload.nearest_trend || "None"}. ${gapPayload.gap_reason || "Opportunity to better align with current trends."}` :
          "Your product has opportunities to better align with current market trends."
      }
    }
    
    case ACTION_TYPES.ADAPTATION_RECOMMENDATION: {
      const adaptPayload = getTypedPayload<AdaptationRecommendationPayload>(action, ACTION_TYPES.ADAPTATION_RECOMMENDATION)
      return {
        title: `Adaptation Strategy for ${product_name || "Product"}`,
        summary: displaySummary,
        details: adaptPayload ? 
          `Strategy: ${adaptPayload.strategy}. Target trend: ${adaptPayload.target_trend || "None"}. ${adaptPayload.reason}` :
          "Recommended strategy to adapt your product for better market fit."
      }
    }
    
    case ACTION_TYPES.MARKETING_PLAN: {
      const marketingPayload = getTypedPayload<MarketingPlanPayload>(action, ACTION_TYPES.MARKETING_PLAN)
      return {
        title: `Marketing Plan for ${product_name || "Product"}`,
        summary: displaySummary,
        details: marketingPayload ? 
          `SEO: "${marketingPayload.seo_description || 'N/A'}", Target: ${marketingPayload.target_demo || 'N/A'}, Strategy: ${marketingPayload.sales_strategy || 'N/A'}, Hashtags: ${marketingPayload.hashtags.join(', ')}` :
          "Comprehensive marketing strategy for your product."
      }
    }
    
    case ACTION_TYPES.STOCK_PLAN: {
      const stockPayload = getTypedPayload<StockPlanPayload>(action, ACTION_TYPES.STOCK_PLAN)
      return {
        title: `Inventory Strategy for ${product_name || "Product"}`,
        summary: displaySummary,
        details: stockPayload ? 
          `Strategy: ${stockPayload.stock_strategy}. ${stockPayload.explanation}` :
          "Inventory optimization recommendations based on trend analysis."
      }
    }
    
    case ACTION_TYPES.IMPROVEMENT_TASK: {
      const taskPayload = getTypedPayload<ImprovementTaskPayload>(action, ACTION_TYPES.IMPROVEMENT_TASK)
      return {
        title: `Product Improvement: ${product_name || "Product"}`,
        summary: displaySummary,
        details: taskPayload ? 
          `Steps: ${taskPayload.steps}. Target trend: ${taskPayload.target_trend || "None"}. ${taskPayload.reasoning}` :
          "Actionable improvements to enhance your product's market position."
      }
    }
    
    case ACTION_TYPES.TREND_OPPORTUNITY: {
      const opportunityPayload = getTypedPayload<TrendOpportunityPayload>(action, ACTION_TYPES.TREND_OPPORTUNITY)
      return {
        title: `Trend Opportunity: ${opportunityPayload?.trend_name || "New Trend"}`,
        summary: displaySummary,
        details: opportunityPayload ? 
          `Trend: ${opportunityPayload.trend_name}. Stock recommendation: ${opportunityPayload.stock_recommendation}. Demographics: ${JSON.stringify(opportunityPayload.demographic)}` :
          "High-momentum trend opportunity for new product development."
      }
    }
    
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION: {
      const skuPayload = getTypedPayload<GlobalSkuSuggestionPayload>(action, ACTION_TYPES.GLOBAL_SKU_SUGGESTION)
      return {
        title: `New Product Suggestion: ${skuPayload?.product_name || "New SKU"}`,
        summary: displaySummary,
        details: skuPayload ? 
          `Product: ${skuPayload.product_name}. Target: ${skuPayload.target_demographic}. Style: ${skuPayload.aesthetic_style}. Price: ${skuPayload.price_range}. Priority: ${skuPayload.inventory_priority}. Features: ${skuPayload.key_features.join(', ')}. Hashtags: ${skuPayload.recommended_hashtags.join(', ')}. Marketing: ${skuPayload.marketing_angle}` :
          "New product opportunity to expand your catalog."
      }
    }
    
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION_LEGACY: {
      const legacyPayload = getTypedPayload<GlobalSkuSuggestionLegacyPayload>(action, ACTION_TYPES.GLOBAL_SKU_SUGGESTION_LEGACY)
      return {
        title: `Product Suggestion`,
        summary: displaySummary,
        details: legacyPayload ? 
          `Consider adding: ${legacyPayload.attribute}` :
          "New product opportunity identified."
      }
    }
    
    default:
      return {
        title: `Action: ${action_type}`,
        summary: displaySummary,
        details: "Actionable insight to improve your product alignment."
      }
  }
}

/**
 * Generates a summary for actions that don't have an AI-generated summary
 */
const generateSummary = (actionType: ActionType, payload: any, productName?: string): string => {
  switch (actionType) {
    case ACTION_TYPES.TREND_MATCH:
      return `Trend matching opportunity for ${productName || "your product"}`
    case ACTION_TYPES.TREND_GAP:
      return "Identify and address gaps in trend alignment"
    case ACTION_TYPES.ADAPTATION_RECOMMENDATION:
      return "Strategic recommendations for product adaptation"
    case ACTION_TYPES.MARKETING_PLAN:
      return `Comprehensive marketing strategy for ${productName || "your product"}`
    case ACTION_TYPES.STOCK_PLAN:
      return "Inventory optimization recommendations"
    case ACTION_TYPES.IMPROVEMENT_TASK:
      return "Specific improvements to enhance product performance"
    case ACTION_TYPES.TREND_OPPORTUNITY:
      return "High-momentum trend opportunity"
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION:
      return "New product opportunity to expand your catalog"
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION_LEGACY:
      return "New product opportunity identified"
    default:
      return "Actionable insight to improve your product alignment"
  }
}

/**
 * Gets an appropriate icon for the action type
 */
export const getActionIcon = (actionType: ActionType): string => {
  switch (actionType) {
    case ACTION_TYPES.TREND_MATCH:
      return "📈"
    case ACTION_TYPES.TREND_GAP:
      return "⚠️"
    case ACTION_TYPES.ADAPTATION_RECOMMENDATION:
      return "🔄"
    case ACTION_TYPES.MARKETING_PLAN:
      return "📢"
    case ACTION_TYPES.STOCK_PLAN:
      return "📦"
    case ACTION_TYPES.IMPROVEMENT_TASK:
      return "🔧"
    case ACTION_TYPES.TREND_OPPORTUNITY:
      return "💡"
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION:
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION_LEGACY:
      return "➕"
    default:
      return "📋"
  }
}

/**
 * Gets a color class for the action type
 */
export const getActionColor = (actionType: ActionType): string => {
  switch (actionType) {
    case ACTION_TYPES.TREND_MATCH:
      return "from-green-500 to-emerald-600"
    case ACTION_TYPES.TREND_GAP:
      return "from-orange-500 to-red-600"
    case ACTION_TYPES.ADAPTATION_RECOMMENDATION:
      return "from-blue-500 to-indigo-600"
    case ACTION_TYPES.MARKETING_PLAN:
      return "from-purple-500 to-pink-600"
    case ACTION_TYPES.STOCK_PLAN:
      return "from-yellow-500 to-orange-600"
    case ACTION_TYPES.IMPROVEMENT_TASK:
      return "from-indigo-500 to-purple-600"
    case ACTION_TYPES.TREND_OPPORTUNITY:
      return "from-emerald-500 to-teal-600"
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION:
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION_LEGACY:
      return "from-cyan-500 to-blue-600"
    default:
      return "from-gray-500 to-gray-600"
  }
}

/**
 * Gets a badge color class for the action type
 */
export const getActionBadgeColor = (actionType: ActionType): string => {
  switch (actionType) {
    case ACTION_TYPES.TREND_MATCH:
      return "bg-green-100 text-green-700"
    case ACTION_TYPES.TREND_GAP:
      return "bg-orange-100 text-orange-700"
    case ACTION_TYPES.ADAPTATION_RECOMMENDATION:
      return "bg-blue-100 text-blue-700"
    case ACTION_TYPES.MARKETING_PLAN:
      return "bg-purple-100 text-purple-700"
    case ACTION_TYPES.STOCK_PLAN:
      return "bg-yellow-100 text-yellow-700"
    case ACTION_TYPES.IMPROVEMENT_TASK:
      return "bg-indigo-100 text-indigo-700"
    case ACTION_TYPES.TREND_OPPORTUNITY:
      return "bg-emerald-100 text-emerald-700"
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION:
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION_LEGACY:
      return "bg-cyan-100 text-cyan-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

/**
 * Formats the action type for display
 */
export const formatActionType = (actionType: ActionType): string => {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Gets priority level for action types (for sorting)
 */
export const getActionPriority = (actionType: ActionType): number => {
  switch (actionType) {
    case ACTION_TYPES.TREND_MATCH:
      return 1
    case ACTION_TYPES.TREND_OPPORTUNITY:
      return 2
    case ACTION_TYPES.MARKETING_PLAN:
      return 3
    case ACTION_TYPES.STOCK_PLAN:
      return 4
    case ACTION_TYPES.ADAPTATION_RECOMMENDATION:
      return 5
    case ACTION_TYPES.IMPROVEMENT_TASK:
      return 6
    case ACTION_TYPES.TREND_GAP:
      return 7
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION:
    case ACTION_TYPES.GLOBAL_SKU_SUGGESTION_LEGACY:
      return 8
    default:
      return 9
  }
}

/**
 * Sorts actions by priority and creation date
 */
export const sortActions = <T extends { action_type?: ActionType; created_at?: string }>(
  actions: T[]
): T[] => {
  return [...actions].sort((a, b) => {
    // First sort by priority
    const priorityA = a.action_type ? getActionPriority(a.action_type) : 999
    const priorityB = b.action_type ? getActionPriority(b.action_type) : 999
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    
    // Then sort by creation date (newest first)
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
    
    return dateB - dateA
  })
}

/**
 * Filters actions by type
 */
export const filterActionsByType = <T extends { action_type?: ActionType }>(
  actions: T[],
  actionType?: ActionType
): T[] => {
  if (!actionType) return actions
  return actions.filter(action => action.action_type === actionType)
}

/**
 * Filters actions by search term
 */
export const filterActionsBySearch = <T extends { 
  action_type?: ActionType; 
  product_name?: string; 
  summary?: string;
  title?: string;
}>(actions: T[], searchTerm: string): T[] => {
  if (!searchTerm.trim()) return actions
  
  const searchLower = searchTerm.toLowerCase()
  return actions.filter(action => {
    const matchesType = action.action_type?.toLowerCase().includes(searchLower) || false
    const matchesProduct = action.product_name?.toLowerCase().includes(searchLower) || false
    const matchesSummary = action.summary?.toLowerCase().includes(searchLower) || false
    const matchesTitle = action.title?.toLowerCase().includes(searchLower) || false
    
    return matchesType || matchesProduct || matchesSummary || matchesTitle
  })
}

/**
 * Gets unique action types from a list of actions
 */
export const getUniqueActionTypes = <T extends { action_type?: ActionType }>(
  actions: T[]
): ActionType[] => {
  const types = new Set<ActionType>()
  actions.forEach(action => {
    if (action.action_type) {
      types.add(action.action_type)
    }
  })
  return Array.from(types).sort()
} 