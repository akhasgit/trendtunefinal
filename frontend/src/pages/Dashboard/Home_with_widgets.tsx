

import React, { useRef } from "react";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import PageMeta from "../../components/common/PageMeta";
import { useWidgetContext } from "../../context/WidgetContext";
import TrendsWidget from "../Widgets/trendsWidget/TrendsWidget";
import HighlightsWidget from "../Widgets/highlightsWidget/HighlightsWidget";

// Reusable widget wrapper that detects long press to enable edit mode.
const WidgetWrapper: React.FC<{ children: React.ReactNode; onRemove: () => void }> = ({ children, onRemove }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPressTimer = () => {
    timerRef.current = setTimeout(() => {
      setIsEditing(true);
    }, 600); // 600ms delay to activate edit mode (wiggle)
  };

  const cancelPressTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      className={`relative ${isEditing ? "animate-wiggle" : ""}`}
      onMouseDown={startPressTimer}
      onMouseUp={cancelPressTimer}
      onMouseLeave={cancelPressTimer}
      onTouchStart={startPressTimer}
      onTouchEnd={cancelPressTimer}
    >
      {children}
      {isEditing && (
        <button
          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-2 focus:outline-none"
          onClick={onRemove}
        >
          ✕
        </button>
      )}
    </div>
  );
};

const Home: React.FC = () => {
  const { widgets, removeWidget } = useWidgetContext();

  return (
    <>
      <PageMeta
        title="TrendTune"
        description="TrendTune"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6 mb-20">
        {widgets.trendsWidget && (
          <div className="col-span-12 xl:col-span-6">
            <WidgetWrapper onRemove={() => removeWidget("trendsWidget")}>
              <TrendsWidget />
            </WidgetWrapper>
          </div>
        )}

         {/* Conditional rendering for HighlightsWidget */}
         {widgets.highlightsWidget && (
          <div className="col-span-12 xl:col-span-6">
            <WidgetWrapper onRemove={() => removeWidget("highlightsWidget")}>
              <HighlightsWidget />
            </WidgetWrapper>
          </div>
        )}
        
        {widgets.ecommerceMetrics && (
          <div className="col-span-12 space-y-6 xl:col-span-7">
            <WidgetWrapper onRemove={() => removeWidget("ecommerceMetrics")}>
              <EcommerceMetrics />
            </WidgetWrapper>
            {widgets.monthlySalesChart && (
              <WidgetWrapper onRemove={() => removeWidget("monthlySalesChart")}>
                <MonthlySalesChart />
              </WidgetWrapper>
            )}
          </div>
        )}
        {widgets.monthlyTarget && (
          <div className="col-span-12 xl:col-span-5">
            <WidgetWrapper onRemove={() => removeWidget("monthlyTarget")}>
              <MonthlyTarget />
            </WidgetWrapper>
          </div>
        )}
        {widgets.statisticsChart && (
          <div className="col-span-12">
            <WidgetWrapper onRemove={() => removeWidget("statisticsChart")}>
              <StatisticsChart />
            </WidgetWrapper>
          </div>
        )}
        <div className="col-span-12 xl:col-span-5">
          {widgets.demographicCard && (
            <WidgetWrapper onRemove={() => removeWidget("demographicCard")}>
              <DemographicCard />
            </WidgetWrapper>
          )}
        </div>
        <div className="col-span-12 xl:col-span-7">
          {widgets.recentOrders && (
            <WidgetWrapper onRemove={() => removeWidget("recentOrders")}>
              <RecentOrders />
            </WidgetWrapper>
          )}
        </div>
      </div>

      {/* Inline CSS for wiggle animation */}
      <style>{`
        @keyframes wiggle {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(3deg);
          }
          50% {
            transform: rotate(0deg);
          }
          75% {
            transform: rotate(-3deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        .animate-wiggle {
          animation: wiggle 0.5s infinite;
        }
      `}</style>
    </>
  );
};

export default Home;
