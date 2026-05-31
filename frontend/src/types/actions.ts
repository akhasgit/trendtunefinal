// Action document interfaces for Firebase quickActions collection

// Base action document interface matching the exact schema
export interface ActionDocument {
  user_id: string
  product_id: string | null
  action_type: ActionType
  payload: ActionPayload
  created_at: string
  product_name?: string
  product_description?: string
  summary?: string
}

// Action type constants matching the schema
export const ACTION_TYPES = {
  TREND_MATCH: 'trend_match',
  TREND_GAP: 'trend_gap',
  ADAPTATION_RECOMMENDATION: 'adaptation_recommendation',
  MARKETING_PLAN: 'marketing_plan',
  STOCK_PLAN: 'stock_plan',
  IMPROVEMENT_TASK: 'improvement_task',
  TREND_OPPORTUNITY: 'trend_opportunity',
  GLOBAL_SKU_SUGGESTION: 'global_sku_suggestion',
  GLOBAL_SKU_SUGGESTION_LEGACY: 'global_sku_suggestion_legacy'
} as const

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES]

// Payload type definitions for better type safety
export interface TrendMatchPayload {
  matched_trend: string
  reason: string
}

export interface TrendGapPayload {
  nearest_trend: string | null
  nearest_trend_reason: string
  gap_reason: string | null
}

export interface AdaptationRecommendationPayload {
  strategy: string
  target_trend: string | null
  reason: string
}

export interface MarketingPlanPayload {
  seo_description: string | null
  hashtags: string[]
  target_demo: string | null
  sales_strategy: string | null
}

export interface StockPlanPayload {
  stock_strategy: string
  explanation: string
}

export interface ImprovementTaskPayload {
  steps: string
  reasoning: string
  target_trend: string | null
}

export interface TrendOpportunityPayload {
  trend_name: string
  demographic: Record<string, any>
  stock_recommendation: string
}

export interface GlobalSkuSuggestionPayload {
  product_name: string
  target_demographic: string
  aesthetic_style: string
  key_features: string[]
  recommended_hashtags: string[]
  marketing_angle: string
  price_range: string
  inventory_priority: string
}

export interface GlobalSkuSuggestionLegacyPayload {
  attribute: string
}

// Union type for all payload types
export type ActionPayload = 
  | TrendMatchPayload
  | TrendGapPayload
  | AdaptationRecommendationPayload
  | MarketingPlanPayload
  | StockPlanPayload
  | ImprovementTaskPayload
  | TrendOpportunityPayload
  | GlobalSkuSuggestionPayload
  | GlobalSkuSuggestionLegacyPayload

// Type guard to check if action has a specific payload type
export const hasPayloadType = <T extends ActionPayload>(
  action: ActionDocument,
  type: ActionType
): action is ActionDocument & { payload: T } => {
  return action.action_type === type
}

// Legacy schema interface (for backward compatibility)
export interface FirestoreAction {
  AiSuggested: string
  actionId: string
  archived: boolean
  canPickOptions: boolean
  completed: boolean
  dateSuggested: any // Firestore Timestamp
  details: string
  options: string[]
  productRecommendations: any[]
  relevantSKUs: string[]
  shownToUser: boolean
  summary: string
  title: string
  trendsMatched: any[]
  type: string[]
}

// Display interface for UI components
export interface QuickAction {
  id: string
  title: string
  summary: string
  action_type?: ActionType
  product_name?: string
  created_at?: string
}

// Type guards
export const isNewSchema = (action: ActionDocument | FirestoreAction): action is ActionDocument => {
  return 'action_type' in action && 'payload' in action
}

export const isCurrentSchema = (action: ActionDocument | FirestoreAction): action is FirestoreAction => {
  return 'title' in action && 'summary' in action && !('action_type' in action)
}

// Helper function to get typed payload
export const getTypedPayload = <T extends ActionPayload>(
  action: ActionDocument,
  type: ActionType
): T | null => {
  return hasPayloadType<T>(action, type) ? action.payload : null
} 