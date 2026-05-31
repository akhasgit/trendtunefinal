// src/pages/TrendsPage/trendspage.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import { db } from "../../firebase/firebase";
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth";

// ────────── Utility: Random "past year" Date ──────────
function getRandomPastDate(): Date {
  const now = Date.now();
  const oneYearAgo = now - 1000 * 60 * 60 * 24 * 365;
  const randomMs = oneYearAgo + Math.random() * (now - oneYearAgo);
  return new Date(randomMs);
}

// ────────── TrendChart Component ──────────
type TrendChartProps = {
  historical: number[];
  forecast: number[];
  labels: string[];
  width?: number;
  height?: number;
};

const TrendChart: React.FC<TrendChartProps> = ({
  historical,
  forecast,
  labels,
  width = 320,
  height = 120,
}) => {
  const data = [...historical, ...forecast];
  if (data.length === 0) return null;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minY = Math.min(...data);
  const maxY = Math.max(...data);

  const getX = (i: number) =>
    padding + (i * chartWidth) / (data.length - 1);
  const getY = (v: number) =>
    padding + chartHeight - ((v - minY) / (maxY - minY || 1)) * chartHeight;

  const getSmoothPath = (points: [number, number][]) => {
    if (points.length < 2) return "";
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const xc = (x0 + x1) / 2;
      const yc = (y0 + y1) / 2;
      d += ` Q ${x0} ${y0}, ${xc} ${yc}`;
    }
    d += ` T ${points[points.length - 1][0]} ${
      points[points.length - 1][1]
    }`;
    return d;
  };

  const historicalPoints = historical.map(
    (v, i) => [getX(i), getY(v)] as [number, number]
  );
  const forecastStart = historical.length - 1;
  const forecastPoints = forecast.map(
    (v, i) => [getX(forecastStart + i), getY(v)] as [number, number]
  );

  const areaPath =
    historicalPoints.length > 1
      ? `M ${historicalPoints[0][0]} ${height - padding} ` +
        historicalPoints.map(([x, y]) => `L ${x} ${y}`).join(" ") +
        ` L ${historicalPoints[historicalPoints.length - 1][0]} ${
          height - padding
        } Z`
      : "";

  const forecastGradient =
    forecast.length > 1 ? forecast[forecast.length - 1] - forecast[0] : 0;
  const forecastColor = forecastGradient >= 0 ? "#22C55E" : "#EF4444";

  return (
    <svg
      width={width}
      height={height}
      className="block mt-4"
      aria-label="Trend line chart"
      role="img"
    >
      {/* Axes */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#CBD5E1"
        strokeWidth={2}
      />
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#CBD5E1"
        strokeWidth={2}
      />

      {/* Area under historical */}
      {areaPath && <path d={areaPath} fill="#3B82F6" fillOpacity={0.08} />}

      {/* Historical smooth line */}
      <path
        d={getSmoothPath(historicalPoints)}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#shadowBlue)"
      />

      {/* Forecast smooth line */}
      {forecast.length > 0 && (
        <path
          d={getSmoothPath(forecastPoints)}
          fill="none"
          stroke={forecastColor}
          strokeWidth={3}
          strokeDasharray="6 4"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#shadowForecast)"
        />
      )}

      {/* Data points */}
      {data.map((v, i) => (
        <circle
          key={i}
          cx={getX(i)}
          cy={getY(v)}
          r={5}
          fill={i < historical.length ? "#3B82F6" : forecastColor}
          fillOpacity={0.7}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}

      {/* Y-axis labels */}
      <text
        x={padding - 10}
        y={getY(maxY)}
        textAnchor="end"
        fontSize={12}
        fill="#64748B"
        fontWeight={500}
      >
        {maxY}
      </text>
      <text
        x={padding - 10}
        y={getY(minY)}
        textAnchor="end"
        fontSize={12}
        fill="#64748B"
        fontWeight={500}
      >
        {minY}
      </text>

      {/* X-axis labels */}
      <text
        x={getX(0)}
        y={height - padding + 24}
        textAnchor="start"
        fontSize={12}
        fill="#64748B"
        fontWeight={500}
      >
        {labels[0]}
      </text>
      <text
        x={getX(data.length - 1)}
        y={height - padding + 24}
        textAnchor="end"
        fontSize={12}
        fill="#64748B"
        fontWeight={500}
      >
        {labels[data.length - 1]}
      </text>

      {/* SVG filters for shadows */}
      <defs>
        <filter id="shadowBlue" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#3B82F6"
            floodOpacity="0.15"
          />
        </filter>
        <filter id="shadowForecast" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor={forecastColor}
            floodOpacity="0.15"
          />
        </filter>
      </defs>
    </svg>
  );
};

// ────────── Firestore Doc Interfaces ──────────
interface TrendRepoDoc {
  averageMonthlyRevenue: Record<string, number>;
  last_6_months: number[];
  next_12_months: number[];
  numberOnWatchList: number;
  products: { title: string }[];
  trendDescription: string;
  trend_name: string;
}

interface PersonalisedTrendDoc {
  trendId: string;
  lastAccessed: Timestamp;
  watchList: boolean;
  chatsUsedIn: string[];
  relevantSKUs: string[];
  recent: boolean;
  recommended: boolean;
  trendName: string;
  trendSearchIndex: string[];
  remarks: string;
}

interface TrendDataSet {
  past_6_months: number[];
  next_12_months: number[];
}

// Extended Trend interface now includes relevantSKUs
interface Trend {
  trendId: string;
  name: string;
  description: string;
  products: { title: string }[];
  trend_data: TrendDataSet;
  lastAccessed: Date;
  watchList: boolean;
  recent: boolean;
  relevantSKUs: string[];
}

// ────────── TrendsPage Component ──────────
const TrendsPage: React.FC = () => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewFilter, setViewFilter] = useState<
    "All" | "WatchList" | "Recent" | "Recommended"
  >("All");
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [expandedTrend, setExpandedTrend] = useState<string | null>(null);
  const { user: authUser, loading: authLoading } = useAnonymousAuth();

  // ────────── Load all TrendsRepo definitions into a map ──────────
  const loadAllTrendDefinitions = async (): Promise<
    Record<string, Omit<Trend, "lastAccessed" | "watchList" | "recent" | "relevantSKUs">>
  > => {
    const repoRef = collection(db, "TrendsRepo");
    const snapshot = await getDocs(repoRef);
    const map: Record<string, Omit<Trend, "lastAccessed" | "watchList" | "recent" | "relevantSKUs">> =
      {};
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as TrendRepoDoc;
      map[docSnap.id] = {
        trendId: docSnap.id,
        name: data.trend_name,
        description: data.trendDescription,
        products: data.products || [],
        trend_data: {
          past_6_months: data.last_6_months || [],
          next_12_months: data.next_12_months || [],
        },
      };
    }
    return map;
  };

  // ────────── Load personalised trends, merge with definitions ──────────
  const loadUserTrendsFromFirestore = async (uid: string) => {
    // 1. Load all definitions
    const definitions = await loadAllTrendDefinitions();

    // 2. Load user's personalisedTrends
    const userTrendsColRef = collection(
      db,
      "personalisedTrends",
      uid,
      "allTrends"
    );
    const userSnap = await getDocs(userTrendsColRef);

    // Build a map of trendId → PersonalisedTrendDoc data
    const userMap: Record<string, PersonalisedTrendDoc> = {};
    userSnap.forEach((docSnap) => {
      const data = docSnap.data() as PersonalisedTrendDoc;
      userMap[docSnap.id] = data;
    });

    // 3. For each trendId in definitions, merge metadata if present
    const merged: Trend[] = Object.entries(definitions).map(
      ([trendId, def]) => {
        if (userMap[trendId]) {
          const u = userMap[trendId];
          return {
            ...def,
            lastAccessed: u.lastAccessed.toDate(),
            watchList: u.watchList,
            recent: u.recent,
            relevantSKUs: u.relevantSKUs || [],
          };
        } else {
          return {
            ...def,
            lastAccessed: getRandomPastDate(),
            watchList: false,
            recent: false,
            relevantSKUs: [],
          };
        }
      }
    );

    setTrends(merged);
  };

  // ────────── Upsert a trend document into Firestore ──────────
  const upsertTrendInFirestore = async (uid: string, trend: Trend) => {
    try {
      const trendDocRef = doc(
        db,
        "personalisedTrends",
        uid,
        "allTrends",
        trend.trendId
      );
      const payload = {
        trendId: trend.trendId,
        lastAccessed: serverTimestamp(),
        watchList: trend.watchList,
        chatsUsedIn: [],
        relevantSKUs: trend.relevantSKUs || [],
        recent: trend.recent,
        recommended: false,
        trendName: trend.name,
        trendSearchIndex: [trend.name.toLowerCase()],
        remarks: "",
      };
      await setDoc(trendDocRef, payload, { merge: true });
    } catch (error) {
      console.error("Error writing to Firestore:", error);
    }
  };

  // ────────── Handlers ──────────
  const handleAddTrend = async (trendId: string) => {
    if (!currentUser) return;
    setTrends((prev) =>
      prev.map((t) =>
        t.trendId === trendId
          ? { ...t, watchList: true, lastAccessed: new Date() }
          : t
      )
    );
    const updated = trends.find((t) => t.trendId === trendId);
    if (updated) {
      await upsertTrendInFirestore(currentUser.uid, {
        ...updated,
        watchList: true,
        lastAccessed: new Date(),
      });
    }
    setSearchQuery("");
  };

  const handleRemoveTrend = async (trendId: string) => {
    if (!currentUser) return;
    setTrends((prev) =>
      prev.map((t) =>
        t.trendId === trendId
          ? { ...t, watchList: false, lastAccessed: new Date() }
          : t
      )
    );
    const updated = trends.find((t) => t.trendId === trendId);
    if (updated) {
      await upsertTrendInFirestore(currentUser.uid, {
        ...updated,
        watchList: false,
        lastAccessed: new Date(),
      });
    }
  };

  const handleExpandTrend = async (trendId: string) => {
    if (currentUser) {
      setTrends((prev) =>
        prev.map((t) =>
          t.trendId === trendId ? { ...t, lastAccessed: new Date() } : t
        )
      );
      const t = trends.find((x) => x.trendId === trendId);
      if (t) {
        await upsertTrendInFirestore(currentUser.uid, {
          ...t,
          lastAccessed: new Date(),
        });
      }
    }
    setExpandedTrend(trendId);
  };

  const handleCloseExpand = () => {
    setExpandedTrend(null);
  };

  // ────────── Derived Data ──────────
  const trackedTrends = useMemo(
    () => trends.filter((t) => t.watchList),
    [trends]
  );
  const recentTrends = useMemo(
    () => trends.filter((t) => t.recent),
    [trends]
  );
  const matchedBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return trends.filter((t) => t.name.toLowerCase().includes(q));
  }, [trends, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const recommendedTrends = trends.filter((t) => !t.watchList && !t.recent);

  const showWatchList =
    (viewFilter === "All" || viewFilter === "WatchList") && !isSearching;
  const showRecent =
    (viewFilter === "All" || viewFilter === "Recent") && !isSearching;
  const showRecommended = viewFilter === "Recommended" && !isSearching;

  useEffect(() => {
    if (authLoading) return;
    if (authUser) {
      setCurrentUser(authUser);
      loadUserTrendsFromFirestore(authUser.uid);
    } else {
      setCurrentUser(null);
      loadAllTrendDefinitions().then((defs) => {
        const defaults: Trend[] = Object.values(defs).map((def) => ({
          ...def,
          lastAccessed: getRandomPastDate(),
          watchList: false,
          recent: false,
          relevantSKUs: [],
        }));
        setTrends(defaults);
      });
    }
  }, [authUser, authLoading]);

  // If user signs out, reload definitions with defaults
  useEffect(() => {
    if (currentUser === null) {
      loadAllTrendDefinitions().then((defs) => {
        const defaults: Trend[] = Object.values(defs).map((def) => ({
          ...def,
          lastAccessed: getRandomPastDate(),
          watchList: false,
          recent: false,
          relevantSKUs: [],
        }));
        setTrends(defaults);
      });
    }
  }, [currentUser]);

  // ────────── Render ──────────
  return (
    <div className="p-4">
      {/* Top Bar: Centered Search + Dropdown */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search trends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mx-auto block w-full md:w-1/3 lg:w-1/4 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Search trends"
        />

        <select
          value={viewFilter}
          onChange={(e) =>
            setViewFilter(
              e.target.value as "All" | "WatchList" | "Recent" | "Recommended"
            )
          }
          className="absolute top-0 right-0 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          aria-label="Filter view"
        >
          <option value="All">All</option>
          <option value="WatchList">WatchList</option>
          <option value="Recent">Recent</option>
          <option value="Recommended">Recommended</option>
        </select>
      </div>

      {/* SEARCH MODE */}
      {isSearching && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {matchedBySearch.map((t) => {
              const months = [
                ...t.trend_data.past_6_months.map((_, i) => `M${i + 1}`),
                ...t.trend_data.next_12_months.map((_, i) => `+${i + 1}m`),
              ];
              const historical = t.trend_data.past_6_months;
              const forecast = t.trend_data.next_12_months;

              if (t.watchList) {
                return (
                  <div
                    key={t.trendId}
                    className="bg-white border rounded shadow-lg p-4 relative cursor-pointer transition-transform hover:scale-[1.02]"
                    tabIndex={0}
                    aria-label={`Tracked Trend: ${t.name}`}
                    onClick={() => handleExpandTrend(t.trendId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleExpandTrend(t.trendId);
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTrend(t.trendId);
                      }}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                      aria-label={`Remove ${t.name}`}
                      tabIndex={0}
                    >
                      &times;
                    </button>

                    <h3 className="text-lg font-semibold mb-2">{t.name}</h3>
                    <p className="text-gray-700 text-sm mb-3">
                      {t.description}
                    </p>

                    {(t.products || []).length > 0 && (
                      <div className="overflow-x-auto mb-3">
                        <table className="min-w-full border border-gray-200 rounded text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-2 py-1 text-left font-semibold">
                                Product Title
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(t.products || []).map((item, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-2 py-1 text-xs">
                                  {item.title}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <TrendChart
                      historical={historical}
                      forecast={forecast}
                      labels={months}
                      width={280}
                      height={120}
                    />
                  </div>
                );
              } else {
                return (
                  <div
                    key={t.trendId}
                    className="bg-white border rounded shadow-lg p-4 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{t.name}</h3>
                      <p className="text-gray-700 text-sm mb-3">
                        {t.description}
                      </p>

                      {(t.products || []).length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <table className="min-w-full border border-gray-200 rounded text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1 text-left font-semibold">
                                  Product Title
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(t.products || []).map((item, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-1 text-xs">
                                    {item.title}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <TrendChart
                        historical={historical}
                        forecast={forecast}
                        labels={months}
                        width={280}
                        height={120}
                      />
                    </div>
                    <button
                      onClick={() => handleAddTrend(t.trendId)}
                      className="mt-4 self-end px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      aria-label={`Add ${t.name}`}
                    >
                      Add
                    </button>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* NOT SEARCHING: show sections based on dropdown */}
      {!isSearching && showWatchList && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Watch List</h2>
          {trackedTrends.length === 0 ? (
            <p className="text-gray-600">You're not tracking any trends yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {trackedTrends.map((t) => {
                const months = [
                  ...t.trend_data.past_6_months.map((_, i) => `M${i + 1}`),
                  ...t.trend_data.next_12_months.map((_, i) => `+${i + 1}m`),
                ];
                const historical = t.trend_data.past_6_months;
                const forecast = t.trend_data.next_12_months;
                return (
                  <div
                    key={t.trendId}
                    className="bg-white border rounded shadow-lg p-4 relative cursor-pointer transition-transform hover:scale-[1.02]"
                    tabIndex={0}
                    aria-label={`Tracked Trend: ${t.name}`}
                    onClick={() => handleExpandTrend(t.trendId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleExpandTrend(t.trendId);
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTrend(t.trendId);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleRemoveTrend(t.trendId);
                      }}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                      aria-label={`Remove ${t.name}`}
                      tabIndex={0}
                    >
                      &times;
                    </button>

                    <h3 className="text-lg font-semibold mb-2">{t.name}</h3>
                    <p className="text-gray-700 text-sm mb-3">
                      {t.description}
                    </p>

                    {/* Display top 3 Relevant SKUs instead of Product Title */}
                    {t.relevantSKUs.length > 0 && (
                      <div className="overflow-x-auto mb-3">
                        <table className="min-w-full border border-gray-200 rounded text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-2 py-1 text-left font-semibold">
                                Relevant SKUs
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.relevantSKUs.slice(0, 3).map((sku, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-2 py-1 text-xs">{sku}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <TrendChart
                      historical={historical}
                      forecast={forecast}
                      labels={months}
                      width={280}
                      height={120}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isSearching && showRecent && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Trends</h2>
          {recentTrends.length === 0 ? (
            <p className="text-gray-600">No recent trends available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {recentTrends.map((t) => {
                const months = [
                  ...t.trend_data.past_6_months.map((_, i) => `M${i + 1}`),
                  ...t.trend_data.next_12_months.map((_, i) => `+${i + 1}m`),
                ];
                const historical = t.trend_data.past_6_months;
                const forecast = t.trend_data.next_12_months;
                return (
                  <div
                    key={t.trendId}
                    className="bg-white border rounded shadow-lg p-4 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{t.name}</h3>
                      <p className="text-gray-700 text-sm mb-3">
                        {t.description}
                      </p>

                      {(t.products || []).length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <table className="min-w-full border border-gray-200 rounded text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1 text-left font-semibold">
                                  Product Title
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(t.products || []).map((item, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-1 text-xs">
                                    {item.title}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <TrendChart
                        historical={historical}
                        forecast={forecast}
                        labels={months}
                        width={280}
                        height={120}
                      />
                    </div>
                    <button
                      onClick={() => handleAddTrend(t.trendId)}
                      className="mt-4 self-end px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      aria-label={`Add ${t.name}`}
                    >
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isSearching && showRecommended && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Recommended</h2>
          {recommendedTrends.length === 0 ? (
            <p className="text-gray-600">No recommendations available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {recommendedTrends.map((t) => {
                const months = [
                  ...t.trend_data.past_6_months.map((_, i) => `M${i + 1}`),
                  ...t.trend_data.next_12_months.map((_, i) => `+${i + 1}m`),
                ];
                const historical = t.trend_data.past_6_months;
                const forecast = t.trend_data.next_12_months;
                return (
                  <div
                    key={t.trendId}
                    className="bg-white border rounded shadow-lg p-4 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{t.name}</h3>
                      <p className="text-gray-700 text-sm mb-3">
                        {t.description}
                      </p>

                      {(t.products || []).length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <table className="min-w-full border border-gray-200 rounded text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-2 py-1 text-left font-semibold">
                                  Product Title
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(t.products || []).map((item, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-1 text-xs">
                                    {item.title}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <TrendChart
                        historical={historical}
                        forecast={forecast}
                        labels={months}
                        width={280}
                        height={120}
                      />
                    </div>
                    <button
                      onClick={() => handleAddTrend(t.trendId)}
                      className="mt-4 self-end px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300"
                      aria-label={`Add ${t.name}`}
                    >
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────── Expanded Modal ────────── */}
      {expandedTrend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          aria-modal="true"
          role="dialog"
          tabIndex={-1}
          onClick={handleCloseExpand}
        >
          {(() => {
            const t = trends.find((x) => x.trendId === expandedTrend);
            if (!t) return null;
            const months = [
              ...t.trend_data.past_6_months.map((_, i) => `M${i + 1}`),
              ...t.trend_data.next_12_months.map((_, i) => `+${i + 1}m`),
            ];
            return (
              <div
                className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full relative overflow-y-auto max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
                tabIndex={0}
                aria-label={`Expanded view for ${t.name}`}
              >
                <button
                  type="button"
                  onClick={handleCloseExpand}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                  aria-label="Close"
                  tabIndex={0}
                >
                  &times;
                </button>
                <h2 className="text-2xl font-bold mb-4">{t.name}</h2>
                <p className="text-gray-700 mb-4">{t.description}</p>

                {(t.products || []).length > 0 && (
                  <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border border-gray-200 rounded text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left font-semibold">
                            Product Title
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(t.products || []).map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{item.title}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <TrendChart
                  historical={t.trend_data.past_6_months}
                  forecast={t.trend_data.next_12_months}
                  labels={months}
                  width={600}
                  height={300}
                />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default TrendsPage;
