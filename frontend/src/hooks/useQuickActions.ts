import { useState, useEffect, useCallback, useMemo } from 'react'
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'
import { 
  ActionDocument, 
  FirestoreAction, 
  QuickAction,
  ActionType,
  isNewSchema,
  isCurrentSchema
} from '../types/actions'
import { 
  generateActionDisplay, 
  sortActions, 
  filterActionsByType, 
  filterActionsBySearch,
  getUniqueActionTypes
} from '../utils/actionDisplay'

interface UseQuickActionsOptions {
  autoLoad?: boolean
  sortByPriority?: boolean
}

interface UseQuickActionsReturn {
  // State
  actions: QuickAction[]
  fullActions: (ActionDocument | FirestoreAction)[]
  loading: boolean
  error: string | null
  
  // Actions
  loadActions: () => Promise<void>
  refreshActions: () => Promise<void>
  getActionById: (id: string) => Promise<ActionDocument | FirestoreAction | null>
  
  // Filtering and sorting
  filterByType: (actionType?: ActionType) => void
  filterBySearch: (searchTerm: string) => void
  clearFilters: () => void
  
  // Computed values
  actionTypes: ActionType[]
  filteredActions: QuickAction[]
  selectedFilter: ActionType | 'all'
  searchTerm: string
}

export const useQuickActions = (options: UseQuickActionsOptions = {}): UseQuickActionsReturn => {
  const { autoLoad = true, sortByPriority = true } = options
  
  // State
  const [fullActions, setFullActions] = useState<(ActionDocument | FirestoreAction)[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<ActionType | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Load actions from Firebase
  const loadActions = useCallback(async () => {
    if (!auth.currentUser) {
      setError('User not authenticated')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const actionsRef = collection(db, 'quickActions', auth.currentUser.uid, 'actions')
      const q = query(actionsRef, orderBy('created_at', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const actionsData: (ActionDocument | FirestoreAction)[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        actionsData.push({ ...data, id: doc.id } as ActionDocument | FirestoreAction)
      })
      
      // Sort by priority if enabled
      const sortedActions = sortByPriority ? sortActions(actionsData) : actionsData
      setFullActions(sortedActions)
    } catch (err) {
      console.error('Error loading quick actions:', err)
      setError('Failed to load quick actions')
    } finally {
      setLoading(false)
    }
  }, [sortByPriority])
  
  // Refresh actions
  const refreshActions = useCallback(async () => {
    await loadActions()
  }, [loadActions])
  
  // Get action by ID
  const getActionById = useCallback(async (id: string): Promise<ActionDocument | FirestoreAction | null> => {
    if (!auth.currentUser) return null
    
    try {
      const actionDoc = await getDoc(doc(db, 'quickActions', auth.currentUser.uid, 'actions', id))
      if (actionDoc.exists()) {
        return actionDoc.data() as ActionDocument | FirestoreAction
      }
      return null
    } catch (err) {
      console.error('Error getting action by ID:', err)
      return null
    }
  }, [])
  
  // Filter by type
  const filterByType = useCallback((actionType?: ActionType) => {
    setSelectedFilter(actionType || 'all')
  }, [])
  
  // Filter by search
  const filterBySearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])
  
  // Clear filters
  const clearFilters = useCallback(() => {
    setSelectedFilter('all')
    setSearchTerm('')
  }, [])
  
  // Convert full actions to display format
  const actions = useMemo(() => {
    return fullActions.map((action) => {
      if (isNewSchema(action)) {
        const { title, summary } = generateActionDisplay(action)
        return {
          id: action.id || '',
          title,
          summary,
          action_type: action.action_type,
          product_name: action.product_name,
          created_at: action.created_at
        }
      } else {
        return {
          id: action.actionId || '',
          title: action.title || 'Untitled Action',
          summary: action.summary || 'No summary available',
          created_at: action.dateSuggested?.toDate?.()?.toISOString()
        }
      }
    })
  }, [fullActions])
  
  // Apply filters
  const filteredActions = useMemo(() => {
    let filtered = actions
    
    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filterActionsByType(filtered, selectedFilter)
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filterActionsBySearch(filtered, searchTerm)
    }
    
    return filtered
  }, [actions, selectedFilter, searchTerm])
  
  // Get unique action types
  const actionTypes = useMemo(() => {
    return getUniqueActionTypes(fullActions)
  }, [fullActions])
  
  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadActions()
    }
  }, [autoLoad, loadActions])
  
  return {
    // State
    actions: filteredActions,
    fullActions,
    loading,
    error,
    
    // Actions
    loadActions,
    refreshActions,
    getActionById,
    
    // Filtering and sorting
    filterByType,
    filterBySearch,
    clearFilters,
    
    // Computed values
    actionTypes,
    filteredActions,
    selectedFilter,
    searchTerm
  }
} 