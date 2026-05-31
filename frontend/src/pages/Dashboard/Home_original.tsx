import React, { useState } from "react";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import PageMeta from "../../components/common/PageMeta";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";


const Home: React.FC = () => {
  const [message, setMessage] = useState<string>("");

  const handleSend = (): void => {
    console.log("Send button clicked with message:", message);
    setMessage("");
  };

  return (
    <>
      <PageMeta
        title="TrendTune"
        description="TrendTune"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6 mb-20">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />
          <MonthlySalesChart />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>
        <div className="col-span-12">
          <StatisticsChart />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>
        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>

      {/* Floating text box centered at the bottom with rounded ends and shadow
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-xl">
        <div className="flex items-center bg-white rounded-full shadow-lg px-4 py-2">
          <input
            type="text"
            placeholder="What would you like to find out today?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-grow bg-transparent focus:outline-none"
          />
          <button
            onClick={handleSend}
            className="ml-2 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700"
          >
            <PaperAirplaneIcon className="h-5 w-5 transform rotate-315" />
          </button>
        </div>
      </div> */}
    </>
  );
};

export default Home;
