"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  LockClosedIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ChartPieIcon,
  BoltIcon,
} from "@heroicons/react/24/solid"
import { useNavigate } from "react-router-dom"
import { auth } from "../../firebase/firebase"
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore"
import { db } from "../../firebase/firebase"

export interface FirstTimeUploadProps {
  onDone?: () => void
}

type TabId = "mapping" | "suggestions" | "dashboard"

// Helper to fetch a random quick action for a user
const getRandomQuickAction = async (userId: string) => {
  try {
    const actionsRef = collection(db, 'quickActions', userId, 'actions')
    const q = query(actionsRef, orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) {
      console.log('No actions found for user')
      return null
    }
    const docs = querySnapshot.docs
    const randomIndex = Math.floor(Math.random() * docs.length)
    const randomDoc = docs[randomIndex]
    const data = randomDoc.data()
    const productName = data.product_name || 'No product name'
    const summary = data.summary || 'No summary available'
    return {
      product_name: productName,
      summary: summary,
      action_type: data.action_type,
      payload: data.payload,
      fullData: data
    }
  } catch (error) {
    console.error('Error fetching random quick action:', error)
    return null
  }
}

// Helper to fetch a random trend document from trend mapping
const getRandomTrendDoc = async (userId: string) => {
  try {
    const trendmapsColRef = collection(db, 'trend_mapping', userId, 'trendmaps');
    const querySnapshot = await getDocs(trendmapsColRef);
    const docs = querySnapshot.docs;
    if (docs.length === 0) return null;
    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    return randomDoc.data();
  } catch (error) {
    console.error('Error fetching random trend doc:', error);
    return null;
  }
}

// Helper: schema mapping for each action_type
const ACTION_TYPE_TABLE_SCHEMA: Record<string, { label: string, field: string, isArray?: boolean, isObject?: boolean }[]> = {
  trend_match: [
    { label: 'Product Name', field: 'product_name' },
    { label: 'Trend Matched', field: 'payload.matched_trend' },
    { label: 'Why/Why Not?', field: 'payload.reason' },
  ],
  trend_gap: [
    { label: 'Product Name', field: 'product_name' },
    { label: 'Nearest Trend', field: 'payload.nearest_trend' },
    { label: 'Nearest Trend Reason', field: 'payload.nearest_trend_reason' },
    { label: 'Gap Reason', field: 'payload.gap_reason' },
  ],
  adaptation_recommendation: [
    { label: 'Product Name', field: 'product_name' },
    { label: 'Target Trend', field: 'payload.target_trend' },
    { label: 'Strategy', field: 'payload.strategy' },
    { label: 'Reason', field: 'payload.reason' },
  ],
  marketing_plan: [
    { label: 'Product Name', field: 'product_name' },
    { label: 'Target Demo', field: 'payload.target_demo' },
    { label: 'SEO Description', field: 'payload.seo_description' },
    { label: 'Hashtags', field: 'payload.hashtags', isArray: true },
    { label: 'Sales Strategy', field: 'payload.sales_strategy' },
  ],
  stock_plan: [
    { label: 'Product Name', field: 'product_name' },
    { label: 'Stock Strategy', field: 'payload.stock_strategy' },
    { label: 'Explanation', field: 'payload.explanation' },
  ],
  improvement_task: [
    { label: 'Product Name', field: 'product_name' },
    { label: 'Target Trend', field: 'payload.target_trend' },
    { label: 'Reasoning', field: 'payload.reasoning' },
    { label: 'Steps', field: 'payload.steps' },
  ],
  trend_opportunity: [
    { label: 'Trend Name', field: 'payload.trend_name' },
    { label: 'Demographic', field: 'payload.demographic', isObject: true },
    { label: 'Demographic desc', field: 'payload.demographic', isObject: true },
    { label: 'Reasoning', field: 'payload.demographic', isObject: true },
  ],
  global_sku_suggestion: [
    { label: 'Product Name', field: 'payload.product_name' },
    { label: 'Target Demographic', field: 'payload.target_demographic' },
    { label: 'Aesthetic Style', field: 'payload.aesthetic_style' },
    { label: 'Key Features', field: 'payload.key_features', isArray: true },
    { label: 'Recommended Hashtags', field: 'payload.recommended_hashtags', isArray: true },
    { label: 'Marketing Angle', field: 'payload.marketing_angle' },
    { label: 'Price Range', field: 'payload.price_range' },
    { label: 'Inventory Priority', field: 'payload.inventory_priority' },
  ],
  global_sku_suggestion_legacy: [
    { label: 'Attribute', field: 'payload.attribute' },
  ],
};

// Mapping from backend action_type to user-friendly label
const ACTION_TYPE_LABELS: Record<string, string> = {
  trend_match: 'Trend Match',
  trend_gap: 'Trend Gap',
  adaptation_recommendation: 'Adaptation Recommendation',
  marketing_plan: 'Marketing Plan',
  stock_plan: 'Stock Plan',
  improvement_task: 'Improvement Task',
  trend_opportunity: 'Trend Opportunity',
  global_sku_suggestion: 'Global SKU Suggestion',
  global_sku_suggestion_legacy: 'Legacy SKU Suggestion',
};

// Helper: get value by path (e.g., 'payload.matched_trend')
function getValueByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

// Helper to format demographic object for display
function formatDemographic(demo: any) {
  if (!demo || typeof demo !== 'object') return String(demo || '—');
  // If it's an array, use the first item
  if (Array.isArray(demo)) demo = demo[0];
  // If it's an object with keys, show the first key and its value
  const keys = Object.keys(demo);
  if (keys.length === 0) return '—';
  const firstKey = keys[0];
  const val = demo[firstKey];
  const desc = val?.['Demographic desc'] || val?.['desc'] || '';
  const reasoning = val?.['Reasoning'] || val?.['reasoning'] || '';
  return (
    <div>
      <div className="font-bold mb-1">{firstKey}</div>
      {desc && <div className="mb-1">{desc}</div>}
      {reasoning && <div className="text-xs text-gray-600">{reasoning}</div>}
    </div>
  );
}

const FirstTimeUpload: React.FC<FirstTimeUploadProps> = ({ onDone }) => {
  const [tab, setTab] = useState<TabId>("mapping")
  const [randomAction, setRandomAction] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [randomTrend, setRandomTrend] = useState<any>(null)
  const navigate = useNavigate()

  const SkeletonRow = ({ cols }: { cols: number }) => (
    <tr className="opacity-40">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded-md animate-pulse" />
        </td>
      ))}
    </tr>
  )

  const renderProgressSteps = () => (
    <div className="flex items-center justify-between mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
      {[
        { step: 1, label: "Upload & Setup", active: true, color: "bg-green-500" },
        { step: 2, label: "Trend Mapping", active: true, color: "bg-green-500" },
        { step: 3, label: "New Products", active: false, color: "bg-gray-300" },
        { step: 4, label: "Demographics", active: false, color: "bg-blue-500" },
      ].map((item, index) => (
        <div key={item.step} className="flex items-center">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
            >
              {item.step}
            </div>
            <span className={`ml-3 font-medium ${item.active ? "text-gray-900" : "text-gray-500"}`}>{item.label}</span>
          </div>
          {index < 3 && <div className="flex-1 h-0.5 bg-gray-200 mx-4 min-w-[60px]" />}
        </div>
      ))}
    </div>
  )

  const renderNavigationTabs = () => (
    <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
      {[
        { id: "mapping", label: "Mapping", icon: DocumentTextIcon },
        { id: "suggestions", label: "Suggestions", icon: ArrowTrendingUpIcon },
        { id: "dashboard", label: "Dashboard", icon: ChartBarIcon },
      ].map((tabItem) => (
        <button
          key={tabItem.id}
          onClick={() => setTab(tabItem.id as TabId)}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 ${
            tab === tabItem.id
              ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <tabItem.icon className="w-5 h-5" />
          {tabItem.label}
        </button>
      ))}
    </div>
  )

  const MetricCard = ({ title, value, icon: Icon, gradient }: any) => (
    <div className={`rounded-xl shadow-lg p-6 ${gradient}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium mb-1 opacity-80">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <Icon className="w-12 h-12 opacity-80" />
      </div>
    </div>
  )

  const CallToActionCard = ({
    title,
    description,
    features,
    buttonText,
    buttonColor,
    borderColor,
    bgGradient,
  }: any) => (
    <div className={`border-2 border-dashed ${borderColor} ${bgGradient} rounded-xl shadow-lg`}>
      <div className="p-8 text-center">
        <div className="flex justify-center mb-4">
          <ChartBarIcon className="w-12 h-12 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">{description}</p>
        <div className="flex items-center justify-center gap-6 mb-6 text-sm text-gray-500">
          {features.map((feature: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <feature.icon className="w-4 h-4" />
              {feature.text}
            </div>
          ))}
        </div>
        <button
          className={`${buttonColor} text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto`}
        >
          <ChartBarIcon className="w-5 h-5" />
          {buttonText}
        </button>
      </div>
    </div>
  )

  const DataTable = ({ title, subtitle, badge, headers, children }: any) => (
    <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{badge}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header: string, index: number) => (
                <th
                  key={index}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">{children}</tbody>
        </table>
      </div>
    </div>
  )

  const renderMapping = () => (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Products Aligned"
          value="1"
          icon={CheckCircleIcon}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900"
        />
        <MetricCard
          title="Need Optimization"
          value="1"
          icon={XCircleIcon}
          gradient="bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900"
        />
        <MetricCard
          title="Alignment Score"
          value="50%"
          icon={ArrowTrendingUpIcon}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900"
        />
      </div>

      {/* Call to Action */}
      
      {/* Data Table */}
      <DataTable
        title="Trend-to-Product Mapping Results"
        subtitle="Analysis of how well your products align with current market trends"
        badge={randomAction && randomAction.action_type ? `Type: ${ACTION_TYPE_LABELS[randomAction.action_type] || randomAction.action_type}` : ''}
        headers={(() => {
          if (!randomAction || !randomAction.action_type) return [];
          const schema = ACTION_TYPE_TABLE_SCHEMA[randomAction.action_type] || [];
          return schema.map(col => col.label);
        })()}
      >
        {loading ? (
          <>
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
          </>
        ) : randomAction && randomAction.action_type ? (
          (() => {
            const schema = ACTION_TYPE_TABLE_SCHEMA[randomAction.action_type] || [];
            return (
              <>
                <tr className="hover:bg-gray-50 transition-colors">
                  {randomAction.action_type === 'trend_opportunity' ? (() => {
                    // Extract first demographic entry
                    let demo = getValueByPath(randomAction, 'payload.demographic');
                    if (Array.isArray(demo)) demo = demo[0];
                    if (demo && typeof demo === 'object') {
                      const keys = Object.keys(demo);
                      const firstKey = keys[0];
                      const val = demo[firstKey] || {};
                      return [
                        <td key="trend_name" className="px-6 py-4 text-gray-900 font-medium">{getValueByPath(randomAction, 'payload.trend_name') || '—'}</td>,
                        <td key="demo_key" className="px-6 py-4 text-gray-900 font-medium">{firstKey || '—'}</td>,
                        <td key="desc" className="px-6 py-4 text-gray-900 font-medium">{val['Demographic desc'] || val['desc'] || '—'}</td>,
                        <td key="reasoning" className="px-6 py-4 text-gray-900 font-medium">{val['Reasoning'] || val['reasoning'] || '—'}</td>,
                      ];
                    } else {
                      // fallback if not object
                      return [
                        <td key="trend_name" className="px-6 py-4 text-gray-900 font-medium">{getValueByPath(randomAction, 'payload.trend_name') || '—'}</td>,
                        <td key="demo_key" className="px-6 py-4 text-gray-900 font-medium">—</td>,
                        <td key="desc" className="px-6 py-4 text-gray-900 font-medium">—</td>,
                        <td key="reasoning" className="px-6 py-4 text-gray-900 font-medium">—</td>,
                      ];
                    }
                  })() : schema.map((col, idx) => {
                    let value = getValueByPath(randomAction, col.field);
                    if (col.label === 'Demographic') {
                      if (Array.isArray(value)) {
                        value = value.length > 0 ? (typeof value[0] === 'object' ? JSON.stringify(value[0]) : String(value[0])) : '—';
                      } else if (value && typeof value === 'object') {
                        value = JSON.stringify(value);
                      } else if (value === undefined || value === null || value === "") {
                        value = "—";
                      }
                    } else {
                      if (col.isArray && Array.isArray(value)) value = value.join(", ");
                      if (col.isObject && value && typeof value === 'object') value = JSON.stringify(value);
                      if (value === undefined || value === null || value === "") value = "—";
                    }
                    return (
                      <td key={idx} className="px-6 py-4 text-gray-900 font-medium">{value}</td>
                    );
                  })}
                </tr>
                {randomAction.summary && (
                  <tr>
                    <td colSpan={schema.length} className="px-6 py-2 text-xs italic text-blue-900 bg-blue-50 rounded-b-xl">
                      {randomAction.summary}
                    </td>
                  </tr>
                )}
              </>
            );
          })()
        ) : (
          <>
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
          </>
        )}
      </DataTable>

      <CallToActionCard
        title="See Complete Analysis in Dashboard"
        description="This preview shows only 2 products. Access your full dashboard to analyze your entire catalog with detailed optimization recommendations and trend predictions."
        features={[
          { icon: EyeIcon, text: "Unlock Hidden Insights" },
          { icon: ChartPieIcon, text: "Advanced Analytics" },
          { icon: BoltIcon, text: "Bulk Optimization" },
        ]}
        buttonText="Go to Dashboard"
        buttonColor="bg-blue-600 hover:bg-blue-700"
        borderColor="border-blue-300"
        bgGradient="bg-gradient-to-r from-blue-50 to-indigo-50"
      />

    </div>
  )

  const renderSuggestions = () => (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="New Opportunities"
          value="2"
          icon={() => (
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">+</span>
            </div>
          )}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900"
        />
        <MetricCard
          title="Avg Trend Velocity"
          value="+31%"
          icon={ArrowTrendingUpIcon}
          gradient="bg-gradient-to-br from-green-50 to-green-100 text-green-900"
        />
        <MetricCard
          title="Price Range"
          value="$10-$80"
          icon={CurrencyDollarIcon}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900"
        />
      </div>

      

      {/* Data Table */}
      <DataTable
        title="Suggested Trend-Aligned Products"
        subtitle="New product opportunities based on trending market demands"
        badge={undefined}
        headers={["Trend", "Meta Category", "Suggested Product", "Why It's Suggested", "Target Demo"]}
      >
        {randomTrend ? (
          <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
              <span>{randomTrend.trend || '—'}</span>
              {randomTrend.velocity !== undefined && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${Number(randomTrend.velocity) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  style={{ minWidth: 40, display: 'inline-block', textAlign: 'center' }}
                >
                  {`+${randomTrend.velocity}%`}
                </span>
              )}
            </td>
            <td className="px-6 py-4">{randomTrend.category || '—'}</td>
            <td className="px-6 py-4 font-medium text-gray-900">
              {(() => {
                const list = Array.isArray(randomTrend.suggestedProducts) && randomTrend.suggestedProducts.length > 0
                  ? randomTrend.suggestedProducts
                  : (Array.isArray(randomTrend.alignedProducts) ? randomTrend.alignedProducts : []);
                return list.length > 0 && list[0]?.name ? list[0].name : '—';
              })()}
            </td>
            <td className="px-6 py-4 text-gray-600">{randomTrend.reason || 'This trend is suggested due to high market demand and alignment with your catalog.'}</td>
            <td className="px-6 py-4">{randomTrend.target || 'Gen Z (16-24)'}</td>
          </tr>
        ) : (
          <SkeletonRow cols={5} />
        )}
      </DataTable>

      {/* Call to Action */}
      <CallToActionCard
        title="See All Opportunities in Dashboard"
        description="You're seeing just 1 of N+ trending product opportunities. Access your dashboard for the complete list with market sizing, supplier contacts, and launch timelines."
        features={[
          { icon: EyeIcon, text: "13+ Products Hidden" },
          { icon: CurrencyDollarIcon, text: "Revenue Projections" },
          { icon: UserGroupIcon, text: "Supplier Network" },
        ]}
        buttonText="Go to Dashboard"
        buttonColor="bg-purple-600 hover:bg-purple-700"
        borderColor="border-purple-300"
        bgGradient="bg-gradient-to-r from-purple-50 to-pink-50"
      />
    </div>
  )

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Demographics"
          value="4"
          icon={UserGroupIcon}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900"
        />
      </div>

      

      {/* Bubble Map */}
      <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Trend Alignment Bubble Map</h3>
              <p className="text-sm text-gray-500">Trends sized by velocity, colored by alignment status</p>
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">Preview</span>
          </div>

          <div className="relative h-80 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl border border-gray-100 overflow-hidden">
            {/* Bubbles */}
            <div className="absolute left-20 bottom-20 w-24 h-24 bg-green-400/80 rounded-full flex items-center justify-center text-white font-medium shadow-lg">
              Eco
            </div>
            <div className="absolute right-28 bottom-16 w-32 h-32 bg-red-400/70 rounded-full flex items-center justify-center text-white font-medium shadow-lg">
              Hand
            </div>

            {/* Axis Labels */}
            <div className="absolute left-4 top-1/2 -rotate-90 text-xs text-gray-500 font-medium">
              ← Market Alignment
            </div>

            {/* Locked Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="bg-white/90 backdrop-blur-sm border border-gray-300 shadow-lg px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-white transition-colors">
                <LockClosedIcon className="w-4 h-4" />8 more trends hidden
              </button>
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-gray-600">Aligned</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-gray-600">Not Aligned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Call to Action */}
      <CallToActionCard
        title="Access Full Demographics in Dashboard"
        description="Access your dashboard for complete trend analysis across all demographics, detailed bubble maps, competitive insights, and actionable recommendations."
        features={[
          { icon: EyeIcon, text: "12+ Hidden Trends" },
          { icon: UserGroupIcon, text: "Advanced Demographics" },
          { icon: BoltIcon, text: "Velocity Predictions" },
        ]}
        buttonText="Go to Dashboard"
        buttonColor="bg-orange-600 hover:bg-orange-700"
        borderColor="border-orange-300"
        bgGradient="bg-gradient-to-r from-orange-50 to-yellow-50"
      />
    </div>
  )

  useEffect(() => {
    const loadRandomAction = async () => {
      if (!auth.currentUser) {
        console.log('No authenticated user')
        return
      }
      setLoading(true)
      const userId = auth.currentUser.uid
      const action = await getRandomQuickAction(userId)
      setRandomAction(action)
      setLoading(false)
      console.log('Random Quick Action:', action)
    }
    loadRandomAction()
  }, [])

  useEffect(() => {
    if (tab !== 'suggestions') return;
    const loadRandomTrend = async () => {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      const trend = await getRandomTrendDoc(userId);
      setRandomTrend(trend);
    };
    loadRandomTrend();
  }, [tab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* {renderProgressSteps()} */}
        {renderNavigationTabs()}

        {tab === "mapping" && renderMapping()}
        {tab === "suggestions" && renderSuggestions()}
        {tab === "dashboard" && renderDashboard()}

        {/* Continue Button */}
        <div className="text-center pt-8">
          <button
            onClick={() => {
              onDone?.()
              navigate("/")
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-4 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default FirstTimeUpload
