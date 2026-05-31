import React from "react";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import PageMeta from "../../components/common/PageMeta";
import { useWidgetContext } from "../../context/WidgetContext";

const WidgetPage: React.FC = () => {
  const { widgets, addWidget } = useWidgetContext();

  return (
    <>
      <PageMeta
        title="Widgets Page"
        description="This page shows widgets that are not on the Home page."
      />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Available Widgets</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!widgets.ecommerceMetrics && (
            <div className="border p-4">
              <h2 className="text-xl">Ecommerce Metrics</h2>
              <button
                onClick={() => addWidget("ecommerceMetrics")}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add to Home
              </button>
            </div>
          )}

{!widgets.trendsWidget && (
  <div className="border p-4">
    <h2 className="text-xl">Trends Widget</h2>
    <button
      onClick={() => addWidget("trendsWidget")}
      className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
    >
      Add to Home
    </button>
  </div>
)}
 {/* Add a card for Highlights Widget */}
 {!widgets.highlightsWidget && (
            <div className="border p-4">
              <h2 className="text-xl">Highlights Widget</h2>
              <button
                onClick={() => addWidget("highlightsWidget")}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add to Home
              </button>
            </div>
          )}
{/* Add a card for Highlights Widget */}


          {!widgets.monthlySalesChart && (
            <div className="border p-4">
              <h2 className="text-xl">Monthly Sales Chart</h2>
              <button
                onClick={() => addWidget("monthlySalesChart")}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add to Home
              </button>
            </div>
          )}
          {!widgets.monthlyTarget && (
            <div className="border p-4">
              <h2 className="text-xl">Monthly Target</h2>
              <button
                onClick={() => addWidget("monthlyTarget")}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add to Home
              </button>
            </div>
          )}
          {!widgets.statisticsChart && (
            <div className="border p-4">
              <h2 className="text-xl">Statistics Chart</h2>
              <button
                onClick={() => addWidget("statisticsChart")}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add to Home
              </button>
            </div>
          )}
          {!widgets.demographicCard && (
            <div className="border p-4">
              <h2 className="text-xl">Demographic Card</h2>
              <button
                onClick={() => addWidget("demographicCard")}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add to Home
              </button>
            </div>
          )}
          {!widgets.recentOrders && (
            <div className="border p-4">
              <h2 className="text-xl">Recent Orders</h2>
              <button
                onClick={() => addWidget("recentOrders")}
                className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WidgetPage;
