"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "../../firebase/firebase"
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid"
import UserDropdown from "../../components/header/UserDropdown"
import CsvUpload from "../../components/csvUpload/csvUpload"
import TakeAction from "../../components/quickActions/quickActions"
import TrendAlignmentBubbleMap from "../../components/charts/TrendAlignmentBubbleMap"
import { 
  QuickAction, 
  ActionDocument,
  FirestoreAction, 
  isNewSchema,
  ActionType
} from "../../types/actions"
import { generateActionDisplay, getActionBadgeColor, formatActionType } from "../../utils/actionDisplay"
import ActionPill from "../../components/quickActions/ActionPill"
import DemographicResultsTable from "../../components/DemographicResultsTable"
import ReactMarkdown from 'react-markdown'

interface DebugAction {
  AiSuggested: string
  actionId: string
  archived: boolean
  canPickOptions: boolean
  completed: boolean
  dateSuggested: any
  details: string
  options: string[]
  productRecommendations: Record<string, any>
  relevantSKUs: string[]
  shownToUser: boolean
  summary: string
  title: string
  trendsMatched: Record<string, any>
  type: string[]
  // New schema fields
  action_type?: string
  payload?: any
  product_name?: string
  product_description?: string
  product_id?: string | null
  user_id?: string
  created_at?: string
}

const HomePage: React.FC = () => {
  // Set this to true to enable debug mode
  const DEBUG_MODE = false

  const [loading, setLoading] = useState(true)
  const [hasProducts, setHasProducts] = useState(false)
  const [showMiniChat, setShowMiniChat] = useState(false)
  const [showFullChat, setShowFullChat] = useState(false)
  const [showTakeAction, setShowTakeAction] = useState(false)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null)

  // Debug mode states
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugActions, setDebugActions] = useState<DebugAction[]>([])
  const [editingAction, setEditingAction] = useState<DebugAction | null>(null)

  // Firestore-backed metrics
  const [alignmentScore, setAlignmentScore] = useState<number | null>(null)
  const [needsAttention, setNeedsAttention] = useState<number | null>(null)
  const [productsAligned, setProductsAligned] = useState<number | null>(null)
  const [newSuggestions, setNewSuggestions] = useState<number | null>(null)
  const [mapId, setMapId] = useState<string>("")

  // Quick actions - now loaded from Firestore
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])
  const [allQuickActions, setAllQuickActions] = useState<QuickAction[]>([]) // Store all actions for filtering
  const [selectedFilter, setSelectedFilter] = useState<string>("all") // Filter state
  const [searchTerm, setSearchTerm] = useState<string>("") // Search state

  // Plan info (free / paid etc.) – fetched silently
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  // Ref for search input
  const searchInputRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()

  const [modalAction, setModalAction] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Add state for the Demographic modal
  const [showDemographicModal, setShowDemographicModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          /** ------------ 1) Product lists check ------------ */
          const listSnap = await getDocs(collection(db, "products", user.uid, "productLists"))
          setHasProducts(listSnap.docs.length > 0)

          /** ------------ 2) Homepage metrics ------------ */
          const infoSnap = await getDoc(doc(db, "homepageInfo", user.uid))
          if (infoSnap.exists()) {
            const d = infoSnap.data()
            setAlignmentScore(d.AlignmentScore ?? null)
            setNeedsAttention(d.needsAttention ?? null)
            setProductsAligned(d.productsAligned ?? null)
            setNewSuggestions(d.newSuggestions ?? null)
            setMapId(d.mapId ?? "")
          }

          /** ------------ 3) Quick actions from Firestore ------------ */
          await loadQuickActions(user.uid)

          /** ------------ 4) Plan info (free / paid) ------------ */
          const userSnap = await getDoc(doc(db, "users", user.uid))
          if (userSnap.exists()) {
            setCurrentPlan(userSnap.data().current_plan ?? null) // 'free', 'pro', etc.
          }
        } catch (err) {
          console.error("Error loading homepage data:", err)
          // fallbacks
          setHasProducts(false)
          setQuickActions([])
        }
      } else {
        // no user signed-in
        setHasProducts(false)
        setQuickActions([])
        setCurrentPlan(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadQuickActions = async (userId: string) => {
    try {
      const qaSnap = await getDocs(collection(db, "quickActions", userId, "actions"))
      const actions: QuickAction[] = qaSnap.docs.map((docSnap) => {
        const d = docSnap.data() as any
        
        // Check if this is the new schema (has action_type field)
        if (isNewSchema(d)) {
          // New schema - generate title and summary from action_type and payload
          const newAction = d as ActionDocument
          const { title, summary } = generateActionDisplay(newAction)
          return {
            id: docSnap.id,
            title,
            summary,
          }
        } else {
          // Current schema - use existing fields
          return {
            id: docSnap.id,
            title: d.title || "Untitled Action",
            summary: d.summary || "No summary available",
          }
        }
      })
      setAllQuickActions(actions) // Store all actions
      setQuickActions(actions) // Initially show all actions

      // Load full action data for action pills and filtering
      const fullActionData: DebugAction[] = qaSnap.docs.map((docSnap) => ({
        ...docSnap.data(),
        actionId: docSnap.id,
      })) as DebugAction[]
      setDebugActions(fullActionData)
    } catch (err) {
      console.error("Error loading quick actions:", err)
    }
  }

  // Filter actions based on selected filter and search term
  const filterActions = (filter: string, search: string = searchTerm) => {
    setSelectedFilter(filter)
    setSearchTerm(search)
    
    let filteredActions = allQuickActions

    // Apply type filter
    if (filter !== "all") {
      filteredActions = filteredActions.filter((action) => {
        const originalAction = debugActions.find(da => da.actionId === action.id)
        if (originalAction && isNewSchema(originalAction as ActionDocument | FirestoreAction)) {
          return (originalAction as any).action_type === filter
        }
        return false // Current schema actions don't have action_type, so they won't match specific filters
      })
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filteredActions = filteredActions.filter((action) => {
        const originalAction = debugActions.find(da => da.actionId === action.id)
        const matchesTitle = action.title.toLowerCase().includes(searchLower)
        const matchesSummary = action.summary.toLowerCase().includes(searchLower)
        const matchesProduct = originalAction && (originalAction as any).product_name && 
          (originalAction as any).product_name.toLowerCase().includes(searchLower)
        
        return matchesTitle || matchesSummary || matchesProduct
      })
    }
    
    setQuickActions(filteredActions)
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value
    filterActions(selectedFilter, search)
  }

  // Get unique action types for filter options
  const getActionTypes = () => {
    const types = new Set<string>()
    debugActions.forEach(action => {
      if (isNewSchema(action as ActionDocument | FirestoreAction)) {
        types.add((action as any).action_type)
      }
    })
    return Array.from(types).sort()
  }

  const handleTakeAction = (actionId: string) => {
    setSelectedActionId(actionId)
    setShowTakeAction(true)
  }

  const handleCloseTakeAction = () => {
    setShowTakeAction(false)
    setSelectedActionId(null)
  }

  const createNewDebugAction = (): DebugAction => ({
    AiSuggested: "pending",
    actionId: "",
    archived: false,
    canPickOptions: false,
    completed: false,
    dateSuggested: serverTimestamp(),
    details: "",
    options: [],
    productRecommendations: {},
    relevantSKUs: [],
    shownToUser: true,
    summary: "",
    title: "",
    trendsMatched: {},
    type: [],
    // New schema fields
    action_type: "trend_match",
    payload: {},
    product_name: "",
    product_description: "",
    product_id: null,
    user_id: auth.currentUser?.uid || "",
    created_at: new Date().toISOString(),
  })

  const handleDebugSave = async (action: DebugAction) => {
    if (!auth.currentUser) return

    try {
      const { actionId, ...actionData } = action

      if (actionId && actionId !== "") {
        // Update existing action
        await updateDoc(doc(db, "quickActions", auth.currentUser.uid, "actions", actionId), actionData)
      } else {
        // Create new action
        await addDoc(collection(db, "quickActions", auth.currentUser.uid, "actions"), actionData)
      }

      // Reload actions
      await loadQuickActions(auth.currentUser.uid)
      setShowDebugModal(false)
      setEditingAction(null)
    } catch (err) {
      console.error("Error saving debug action:", err)
      alert("Failed to save action")
    }
  }

  const handleDebugDelete = async (actionId: string) => {
    if (!auth.currentUser || !confirm("Are you sure you want to delete this action?")) return

    try {
      await deleteDoc(doc(db, "quickActions", auth.currentUser.uid, "actions", actionId))
      await loadQuickActions(auth.currentUser.uid)
    } catch (err) {
      console.error("Error deleting debug action:", err)
      alert("Failed to delete action")
    }
  }

  // User-friendly field labels
  const FIELD_LABELS: Record<string, string> = {
    product_name: "Product Name",
    product_description: "Product Description",
    product_id: "SKU ID",
    action_type: "Action Type",
    completed: "Completed",
    strategy: "Strategy",
    target_demo: "Target Audience",
    hashtags: "Hashtags",
    seo_description: "SEO Description",
    sales_strategy: "Sales Strategy",
    text: "Text",
    // Add more as needed
  };

  // Helper to prettify unknown field keys
  const prettifyKey = (key: string) =>
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

  // User-friendly action type mapping
  const ACTION_TYPE_LABELS: Record<string, string> = {
    adaptation_recommendation: "Adaptation Recommendation",
    marketing_plan: "Marketing Plan",
    trend_match: "Trend Match",
    stock_plan: "Stock Plan",
    improvement_task: "Improvement Task",
    // Add more as needed
  };

  // Field groupings (remove 'summary')
  const GROUPS: Record<string, string[]> = {
    "Product Details": ["product_name", "product_description", "product_id"],
    "Action Details": ["action_type", "completed", "type", "details"],
    "Recommendations": ["productRecommendations"],
    "Options": ["options", "relevantSKUs"],
  };

  // Helper to flatten object fields (payload, productRecommendations, etc.)
  const flattenFields = (actionObj: any, keysToFlatten: string[] = ["payload", "productRecommendations"]) => {
    let flatObj = { ...actionObj };
    keysToFlatten.forEach((key) => {
      if (typeof flatObj[key] === "object" && flatObj[key] !== null) {
        Object.entries(flatObj[key]).forEach(([k, v]) => {
          // Only add if not already present at top level
          if (!(k in flatObj)) {
            flatObj[k] = v;
          }
        });
        delete flatObj[key];
      }
    });
    return flatObj;
  };

  // Helper to format values
  const renderFieldValue = (key: string, value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400 italic">None</span>;
    if (key === "action_type" && typeof value === "string") {
      return <span className="text-base font-medium text-gray-700">{ACTION_TYPE_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>;
    }
    if (typeof value === "boolean") {
      return value ? <span className="text-green-600 font-semibold">Yes</span> : <span className="text-red-500 font-semibold">No</span>;
    }
    if (typeof value === "string" && key.toLowerCase().includes("date")) {
      // Try to format as date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return <span>{date.toLocaleString()}</span>;
      }
    }
    if (typeof value === "string" && key === "created_at") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return <span>{date.toLocaleString()}</span>;
      }
    }
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc ml-6 space-y-1">
          {value.map((item, idx) => (
            <li key={idx}>{renderFieldValue("", item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === "object") {
      // Default: pretty print
      return (
        <pre className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-sm font-mono leading-snug overflow-x-auto whitespace-pre-wrap">
          <code>{JSON.stringify(value, null, 2)}</code>
        </pre>
      );
    }
    return <span className="text-base font-medium text-gray-700">{String(value)}</span>;
  };

  // Render grouped fields (flatten payload, etc.)
  const renderGroupedFields = (actionObj: any) => {
    if (!actionObj) return null;
    const exclude = new Set(["actionId", "id", "created_at", "user_id", "summary"]);
    // Flatten payload, productRecommendations, etc.
    const flatObj = flattenFields(actionObj, ["payload", "productRecommendations"]);
    const shownFields = new Set<string>();
    // Render each group
    const sections = Object.entries(GROUPS).map(([section, keys]) => {
      const presentKeys = keys.filter((k) => k in flatObj && !exclude.has(k));
      if (presentKeys.length === 0) return null;
      presentKeys.forEach((k) => shownFields.add(k));
      return (
        <div key={section} className="mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
            {section === "Product Details" && <span>📦</span>}
            {section === "Action Details" && <span>⚡</span>}
            {section === "Recommendations" && <span>💡</span>}
            {section === "Options" && <span>🔢</span>}
            {section}
          </h3>
          <div className="space-y-3">
            {presentKeys.map((key) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[140px] sm:text-right sm:pr-4 whitespace-nowrap">
                  {FIELD_LABELS[key] || prettifyKey(key)}:
                </span>
                <span className="flex-1 break-words whitespace-pre-line">{renderFieldValue(key, flatObj[key])}</span>
              </div>
            ))}
          </div>
        </div>
      );
    });
    // Find any extra fields not shown
    const extraFields = Object.keys(flatObj).filter((k) =>
      !shownFields.has(k) &&
      !exclude.has(k)
    );
    return (
      <>
        {sections}
        {extraFields.length > 0 && (
          <div className="mb-6 space-y-3">
            {extraFields.map((key) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[140px] sm:text-right sm:pr-4 whitespace-nowrap">
                  {FIELD_LABELS[key] || prettifyKey(key)}:
                </span>
                <span className="flex-1 break-words whitespace-pre-line">{renderFieldValue(key, flatObj[key])}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // Modal component for showing all action data
  const ActionDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    action: any;
  }> = ({ isOpen, onClose, action }) => {
    if (!isOpen || !action) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          className="relative w-full
            max-w-full sm:max-w-2xl lg:max-w-4xl
            h-[95vh] sm:h-[90vh] lg:h-[80vh]
            mx-2 sm:mx-4
            bg-white rounded-3xl shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
            <h2 className="text-lg sm:text-2xl font-bold text-blue-900">All Action Data</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Close"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 bg-white rounded-b-3xl">
            {renderGroupedFields(action)}
            {action?.recommendations && Array.isArray(action.recommendations) && (
              <div>
                <h3 className="text-xl font-bold text-green-800 mb-4">Stock Recommendations</h3>
                <ul className="space-y-4">
                  {action.recommendations.map((rec: string, i: number) => (
                    <li
                      key={i}
                      className="bg-green-50 border border-green-200 rounded-xl p-4 text-gray-800 text-base shadow"
                    >
                      <ReactMarkdown
                        components={{
                          strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                          li: ({node, ...props}) => <li className="mb-2" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-2" {...props} />,
                        }}
                      >
                        {rec}
                      </ReactMarkdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* -------------------------------------------------- */
  /*  Loading gate                                     */
  /* -------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-6">
          <div className="relative">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TrendTune
            </h1>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
          <p className="text-gray-600 font-medium">Dashboard loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col relative">
      {/* Top nav */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TrendTune
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-2 ml-6">
              <Link
                to="/"
                className="px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-sm font-medium hover:from-blue-200 hover:to-blue-300 transition-all duration-200 flex items-center gap-2"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Chat
              </Link>

              {hasProducts ? (
                <Link
                  to="/products"
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  My Products
                </Link>
              ) : (
                <Link
                  to="/products"
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Upload Products
                </Link>
              )}

              <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Daily Report
              </button>
            </div>
          </div>
          <UserDropdown />
        </div>
      </header>

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto p-4 ${hasProducts ? "pb-32" : "pb-8"}`}>
        {!hasProducts ? (
          <CsvUpload onUploadComplete={() => setHasProducts(true)} />
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Metrics + MAP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* KPI column */}
              <div className="lg:col-span-1 space-y-4">
                {/* Alignment Score Card */}
                <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold opacity-90">Alignment Score</h3>
                        <div className="text-2xl font-bold mt-1">
                          {alignmentScore !== null ? `${alignmentScore}%` : "—"}
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-1">
                          <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {needsAttention !== null ? needsAttention : "—"}
                        </div>
                        <div className="text-xs text-gray-500">Needs Attention</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-1">
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {productsAligned !== null ? productsAligned : "—"}
                        </div>
                        <div className="text-xs text-gray-500">Products Aligned</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* New Suggestions Card */}
                <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-3 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold opacity-90">New Suggestions</h3>
                        <div className="text-2xl font-bold mt-1">{newSuggestions !== null ? newSuggestions : "—"}</div>
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <LightBulbIcon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-200">
                      View All Suggestions
                    </button>
                  </div>
                </div>

                {/* Demographic Results Card */}
                <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden mt-4">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-3 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold opacity-90">Demographic Results</h3>
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        {/* You can use an icon here if desired */}
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 11a4 4 0 10-8 0 4 4 0 008 0zm6 8v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a6 6 0 0112 0v1a2 2 0 002 2h2a2 2 0 002-2v-1a6 6 0 00-6-6z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <button
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-800 transition-all duration-200"
                      onClick={() => setShowDemographicModal(true)}
                    >
                      View Demographic Results
                    </button>
                  </div>
                </div>
              </div>

              {/* Map section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden h-full min-h-[300px]">
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Trend Alignment Map</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Live Data
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Visual representation of your product-trend alignment</p>
                  </div>
                  <div className="p-3 h-full">
                    <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                      <TrendAlignmentBubbleMap />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
                  <p className="text-gray-600">Complete these tasks to improve your alignment score</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search actions... (Ctrl+K)"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchTerm("")
                          filterActions(selectedFilter, "")
                        }
                      }}
                      className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      ref={searchInputRef}
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm("")
                          filterActions(selectedFilter, "")
                        }}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Filter Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedFilter}
                      onChange={(e) => filterActions(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">All Actions ({allQuickActions.length})</option>
                      {getActionTypes().map((actionType) => {
                        const count = allQuickActions.filter((action) => {
                          const originalAction = debugActions.find(da => da.actionId === action.id)
                          return originalAction && isNewSchema(originalAction as ActionDocument | FirestoreAction) && (originalAction as any).action_type === actionType
                        }).length
                        return (
                          <option key={actionType} value={actionType}>
                            {formatActionType(actionType as ActionType)} ({count})
                          </option>
                        )
                      })}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Action Count Badge */}
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                    onClick={() => navigate("/all-quick-actions")}
                  >
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    <span className="font-medium">{quickActions.length} Actions</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Filter Status */}
              {(selectedFilter !== "all" || searchTerm.trim()) && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-700">
                      {selectedFilter !== "all" && searchTerm.trim() 
                        ? `Showing ${formatActionType(selectedFilter as ActionType)} actions matching "${searchTerm}"`
                        : selectedFilter !== "all"
                        ? `Showing ${formatActionType(selectedFilter as ActionType)} actions only`
                        : `Searching for "${searchTerm}"`
                      }
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm("")
                      filterActions("all", "")
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              <div className="grid gap-4">
                {quickActions.length > 0 ? (
                  quickActions.map((action) => {
                    const originalAction = debugActions.find(da => da.actionId === action.id)

                    return (
                      <div
                        key={action.id}
                        className={`bg-white rounded-xl shadow-lg border-0 p-6 hover:shadow-xl transition-shadow duration-200 cursor-pointer`}
                        onClick={() => {
                          setModalAction(originalAction);
                          setShowActionModal(true);
                        }}
                        tabIndex={0}
                        role="button"
                        aria-haspopup="dialog"
                        aria-label={`Show details for ${action.title}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              {originalAction && isNewSchema(originalAction as ActionDocument | FirestoreAction) ? (
                                <ActionPill action={originalAction as ActionDocument} />
                              ) : (
                                <span className="px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
                                  {originalAction && (originalAction as any).action_type 
                                    ? formatActionType((originalAction as any).action_type)
                                    : 'Unknown Action'
                                  }
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-3">{action.summary}</p>
                            {/* Product context for actions with product_name property */}
                            {originalAction && 'product_name' in originalAction && typeof (originalAction as any).product_name === 'string' && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 w-fit">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span>Product: {(originalAction as any).product_name}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation(); // Prevents modal from opening when clicking "Take Action"
                              handleTakeAction(action.id);
                            }}
                            className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2"
                          >
                            <BoltIcon className="w-4 h-4" />
                            Take Action
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : selectedFilter !== "all" || searchTerm.trim() ? (
                  // No results for filtered/searched view
                  <div className="bg-white rounded-xl shadow-lg border-0 p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedFilter !== "all" && searchTerm.trim()
                        ? `No ${formatActionType(selectedFilter as ActionType)} actions found matching "${searchTerm}"`
                        : selectedFilter !== "all"
                        ? `No ${formatActionType(selectedFilter as ActionType)} actions found`
                        : `No actions found matching "${searchTerm}"`
                      }
                    </h3>
                    <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria.</p>
                    <button
                      onClick={() => {
                        setSearchTerm("")
                        filterActions("all", "")
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                    >
                      Show All Actions
                    </button>
                  </div>
                ) : (
                  // No actions at all
                  <div className="bg-white rounded-xl shadow-lg border-0 p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircleIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-500">No quick actions available at the moment.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Debug Mode Button */}
      {DEBUG_MODE && (
        <button
          onClick={() => setShowDebugModal(true)}
          className="fixed bottom-8 left-8 bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-full shadow-2xl hover:from-orange-700 hover:to-red-700 z-40 transform hover:scale-110 transition-all duration-200"
          title="Debug Mode - Manage Quick Actions"
        >
          <WrenchScrewdriverIcon className="w-6 h-6" />
        </button>
      )}

      {/* Debug Modal */}
      {DEBUG_MODE && showDebugModal && (
        <DebugModal
          isOpen={showDebugModal}
          onClose={() => {
            setShowDebugModal(false)
            setEditingAction(null)
          }}
          actions={debugActions}
          editingAction={editingAction}
          onEdit={setEditingAction}
          onSave={handleDebugSave}
          onDelete={handleDebugDelete}
          onNew={() => setEditingAction(createNewDebugAction())}
        />
      )}

      {/* Take Action Modal */}
      <TakeAction isOpen={showTakeAction} onClose={handleCloseTakeAction} actionId={selectedActionId} />

      {/* Floating bottom bar - Only show when hasProducts is true (on actual homepage) */}
      {hasProducts && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-lg bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 flex justify-around items-center shadow-2xl border border-gray-200 z-20">
          <button className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-105 transition-transform duration-200">
              12%
            </div>
            <span className="text-xs mt-2 text-gray-600 font-medium">Today's Improvement</span>
          </button>
          <button className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-105 transition-transform duration-200">
              5
            </div>
            <span className="text-xs mt-2 text-gray-600 font-medium">Tasks Finished</span>
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          if (showFullChat) setShowFullChat(false)
          else setShowMiniChat((prev) => !prev)
        }}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:from-blue-700 hover:to-indigo-700 z-40 transform hover:scale-110 transition-all duration-200"
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />
      </button>

      {/* Mini Chat Window */}
      {showMiniChat && !showFullChat && (
        <div className="fixed bottom-24 right-8 w-80 h-64 bg-white rounded-2xl shadow-2xl z-40 flex flex-col border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
            <span className="font-semibold">AI Assistant</span>
            <button
              onClick={() => setShowFullChat(true)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <ArrowsPointingOutIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 p-4 text-sm text-gray-600 overflow-auto">
            <div className="space-y-3">
              <div className="bg-gray-100 p-3 rounded-lg max-w-xs">
                Hi there! I'm your AI assistant. How can I help you optimize your product alignment today?
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100">
            <input
              type="text"
              placeholder="Ask me anything..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Full Chat Window */}
      {showFullChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl h-3/4 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div>
                <h3 className="font-semibold text-lg">AI Assistant</h3>
                <p className="text-blue-100 text-sm">Your personal trend analysis expert</p>
              </div>
              <button
                onClick={() => setShowFullChat(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-gray-50">
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm max-w-xs">
                  <p className="text-gray-700">
                    Welcome! I can help you analyze trends, optimize product alignment, and discover new opportunities.
                    What would you like to explore?
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place the modal at the root of the return */}
      <ActionDetailsModal isOpen={showActionModal} onClose={() => setShowActionModal(false)} action={modalAction} />

      {/* Demographic Results Modal */}
      {showDemographicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-3xl">
              <h2 className="text-lg sm:text-2xl font-bold text-indigo-900">Demographic Results</h2>
              <button
                onClick={() => setShowDemographicModal(false)}
                className="p-2 rounded-full hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Close"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <DemographicResultsTable />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Debug Modal Component
interface DebugModalProps {
  isOpen: boolean
  onClose: () => void
  actions: DebugAction[]
  editingAction: DebugAction | null
  onEdit: (action: DebugAction) => void
  onSave: (action: DebugAction) => void
  onDelete: (actionId: string) => void
  onNew: () => void
}

const DebugModal: React.FC<DebugModalProps> = ({
  isOpen,
  onClose,
  actions,
  editingAction,
  onEdit,
  onSave,
  onDelete,
  onNew,
}) => {
  const [formData, setFormData] = useState<DebugAction | null>(null)

  useEffect(() => {
    if (editingAction) {
      setFormData({ ...editingAction })
    }
  }, [editingAction])

  const handleSave = () => {
    if (formData) {
      onSave(formData)
    }
  }

  const updateFormField = (field: keyof DebugAction, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value })
    }
  }

  const addArrayItem = (field: "options" | "relevantSKUs" | "type") => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: [...formData[field], ""],
      })
    }
  }

  const updateArrayItem = (field: "options" | "relevantSKUs" | "type", index: number, value: string) => {
    if (formData) {
      const newArray = [...formData[field]]
      newArray[index] = value
      setFormData({ ...formData, [field]: newArray })
    }
  }

  const removeArrayItem = (field: "options" | "relevantSKUs" | "type", index: number) => {
    if (formData) {
      const newArray = formData[field].filter((_, i) => i !== index)
      setFormData({ ...formData, [field]: newArray })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        {/* Actions List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Debug Actions</h3>
              <button
                onClick={onNew}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                New
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {actions.map((action) => (
              <div
                key={action.actionId}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  editingAction?.actionId === action.actionId
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => onEdit(action)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{action.title || "Untitled"}</h4>
                    <p className="text-sm text-gray-500 truncate">{action.summary}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(action)
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(action.actionId)
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{formData?.actionId ? "Edit Action" : "New Action"}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {formData && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormField("title", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Suggested</label>
                  <select
                    value={formData.AiSuggested}
                    onChange={(e) => updateFormField("AiSuggested", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <textarea
                  value={formData.details}
                  onChange={(e) => updateFormField("details", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Boolean Fields */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.canPickOptions}
                    onChange={(e) => updateFormField("canPickOptions", e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Can Pick Options</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.archived}
                    onChange={(e) => updateFormField("archived", e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Archived</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.completed}
                    onChange={(e) => updateFormField("completed", e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Completed</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.shownToUser}
                    onChange={(e) => updateFormField("shownToUser", e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Shown to User</span>
                </label>
              </div>

              {/* Array Fields */}
              {(["options", "relevantSKUs", "type"] as const).map((field) => (
                <div key={field}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 capitalize">{field}</label>
                    <button
                      onClick={() => addArrayItem(field)}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData[field].map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateArrayItem(field, index, e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`${field} ${index + 1}`}
                        />
                        <button
                          onClick={() => removeArrayItem(field, index)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData}
                className="px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50"
              >
                Save Action
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage


