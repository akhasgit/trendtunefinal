import React, { useState } from "react";
// import { useRouter } from "next/router";
import { useNavigate } from "react-router-dom";
// At the top of your file
import { FaCommentDots } from "react-icons/fa"; // 💬 chat icon

import { LineChart, Line, ResponsiveContainer } from "recharts";

// Sample trend definitions with sample data and change percentages
const sampleTrends = [
  { label: "Trend A", value: "trendA", data: [10, 20, 30, 25, 40], change: 2.35 },
  { label: "Trend B", value: "trendB", data: [5, 6, 7, 6, 7], change: -1.58 },
  { label: "Trend C", value: "trendC", data: [15, 15, 18, 17, 19], change: 1.0 },
  { label: "Trend D", value: "trendD", data: [20, 19, 22, 21, 23], change: 3.45 },
  { label: "Trend E", value: "trendE", data: [2, 3, 2, 3, 4], change: 0.72 },
];

// Demographic filter options
const demographicOptions = ["All", "Demographic A", "Demographic B", "Demographic C"];

const TrendsWidget: React.FC = () => {
  // State for selected trends (max 5)
  const [selectedTrends, setSelectedTrends] = useState<typeof sampleTrends>([]);
  // State for demographic filtering
  const [demographicFilter, setDemographicFilter] = useState<string>("All");
  // State for handling the expand animation
  const [isExpanding, setIsExpanding] = useState(false);
  const navigate = useNavigate();

  // Handler to add a trend from the dropdown
  const handleAddTrend = (trendValue: string) => {
    if (selectedTrends.length >= 5) return;

    const foundTrend = sampleTrends.find((trend) => trend.value === trendValue);
    if (foundTrend && !selectedTrends.some((t) => t.value === foundTrend.value)) {
      setSelectedTrends((prev) => [...prev, foundTrend]);
    }
  };

  // Handler to remove a trend from the selection
  const handleRemoveTrend = (trendValue: string) => {
    setSelectedTrends((prev) => prev.filter((trend) => trend.value !== trendValue));
  };

  // Adjust the chart data based on the selected demographic filter
  const modifyDataForDemographic = (data: number[]): number[] => {
    switch (demographicFilter) {
      case "Demographic A":
        return data.map((val) => val * 1.1);
      case "Demographic B":
        return data.map((val) => val * 0.9);
      case "Demographic C":
        return data.map((val) => val * 1.2);
      default:
        return data;
    }
  };

  // Handle widget expansion: triggers animation then navigates to expanded page
  const handleExpand = () => {
    setIsExpanding(true);
    // Wait for the animation to complete before navigating (adjust timing as needed)
    setTimeout(() => {
    //   router.push("/trends-expanded");
        navigate("/trends-expanded");

    }, 500); // 500ms matches animation duration below
  };

  return (
    <div
      className={`relative bg-white rounded shadow p-4 transition-transform duration-500 ${
        isExpanding ? "animate-expand" : ""
      }`}
    >
      {/* Header with Title and Demographic Filter */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Trends Widget</h2>
        {/* Demographic Filter Dropdown */}
        <select
          value={demographicFilter}
          onChange={(e) => setDemographicFilter(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
        >
          {demographicOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Trend Selection Dropdown */}
      <div className="mb-4">
        <label htmlFor="trendSelect" className="mr-2">
          Select a Trend:
        </label>
        <select
          id="trendSelect"
          onChange={(e) => handleAddTrend(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
          defaultValue=""
        >
          <option value="" disabled>
            -- Choose a trend --
          </option>
          {sampleTrends.map((trend) => (
            <option key={trend.value} value={trend.value}>
              {trend.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500">You can add up to 5 trends.</p>
      </div>

      {/* Display Selected Trends */}
      <div className="space-y-2">
        {selectedTrends.map((trend) => {
          const modifiedData = modifyDataForDemographic(trend.data);
          const chartData = modifiedData.map((val, index) => ({
            name: `Point ${index + 1}`,
            value: val,
          }));

          return (
            <div
              key={trend.value}
              className="p-2 bg-gray-100 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{trend.label}</p>
                <p
                  className={`text-sm ${
                    trend.change >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend.change >= 0 ? `+${trend.change}%` : `${trend.change}%`}
                </p>
                <div className="mt-2 w-48 h-16">
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <button
                onClick={() => handleRemoveTrend(trend.value)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {/* Expand Button at Bottom Left */}
      <div className="absolute bottom-2 left-2">
        <button onClick={handleExpand} className="bg-blue-500 text-white px-3 py-1 rounded">
          Expand
        </button>
      </div>

      {/* Action buttons at Bottom Right */}
<div className="absolute bottom-2 right-2 flex items-center gap-2">
  

  {/* Chat Icon Button */}
  <button
    onClick={() => console.log("Chat icon clicked")}
    className="text-gray-500 hover:text-gray-300"
    aria-label="Chat"
  >
    <FaCommentDots size={20} />
  </button>
</div>


      {/* Inline CSS for the expansion animation */}
      <style>{`
        @keyframes expand {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-expand {
          animation: expand 0.5s forwards;
        }
      `}</style>
    </div>
  );
};

export default TrendsWidget;


// import React, { useState } from "react";
// import { LineChart, Line, ResponsiveContainer } from "recharts";

// // Sample trend definitions with sample data and change percentages
// const sampleTrends = [
//   { label: "Trend A", value: "trendA", data: [10, 20, 30, 25, 40], change: 2.35 },
//   { label: "Trend B", value: "trendB", data: [5, 6, 7, 6, 7], change: -1.58 },
//   { label: "Trend C", value: "trendC", data: [15, 15, 18, 17, 19], change: 1.0 },
//   { label: "Trend D", value: "trendD", data: [20, 19, 22, 21, 23], change: 3.45 },
//   { label: "Trend E", value: "trendE", data: [2, 3, 2, 3, 4], change: 0.72 },
// ];

// // Sample demographic filter options. You can expand these as needed.
// const demographicOptions = ["All", "Demographic A", "Demographic B", "Demographic C"];

// const TrendsWidget: React.FC = () => {
//   // Store the selected trends (max 5)
//   const [selectedTrends, setSelectedTrends] = useState<typeof sampleTrends>([]);
//   // State for tracking the currently selected demographic filter
//   const [demographicFilter, setDemographicFilter] = useState<string>("All");

//   // When a new trend is selected from the dropdown
//   const handleAddTrend = (trendValue: string) => {
//     if (selectedTrends.length >= 5) return;

//     const foundTrend = sampleTrends.find((trend) => trend.value === trendValue);
//     if (foundTrend) {
//       // Prevent adding duplicates
//       if (!selectedTrends.some((t) => t.value === foundTrend.value)) {
//         setSelectedTrends((prev) => [...prev, foundTrend]);
//       }
//     }
//   };

//   // Remove a trend from the selected list
//   const handleRemoveTrend = (trendValue: string) => {
//     setSelectedTrends((prev) => prev.filter((trend) => trend.value !== trendValue));
//   };

//   // Simulate modified chart data based on demographic filter
//   const modifyDataForDemographic = (data: number[]): number[] => {
//     switch (demographicFilter) {
//       case "Demographic A":
//         return data.map((val) => val * 1.1);
//       case "Demographic B":
//         return data.map((val) => val * 0.9);
//       case "Demographic C":
//         return data.map((val) => val * 1.2);
//       default:
//         return data;
//     }
//   };

//   return (
//     <div className="bg-white rounded shadow p-4">
//       {/* Header: Title & Demographic Filter */}
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-bold">Trends Widget</h2>
//         {/* Demographic Filter Dropdown at top right */}
//         <select
//           value={demographicFilter}
//           onChange={(e) => setDemographicFilter(e.target.value)}
//           className="border border-gray-300 rounded px-2 py-1"
//         >
//           {demographicOptions.map((option) => (
//             <option key={option} value={option}>
//               {option}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Trend Selection Dropdown */}
//       <div className="mb-4">
//         <label htmlFor="trendSelect" className="mr-2">
//           Select a Trend:
//         </label>
//         <select
//           id="trendSelect"
//           onChange={(e) => handleAddTrend(e.target.value)}
//           className="border border-gray-300 rounded px-2 py-1"
//           defaultValue=""
//         >
//           <option value="" disabled>
//             -- Choose a trend --
//           </option>
//           {sampleTrends.map((trend) => (
//             <option key={trend.value} value={trend.value}>
//               {trend.label}
//             </option>
//           ))}
//         </select>
//         <p className="text-sm text-gray-500">You can add up to 5 trends.</p>
//       </div>

//       {/* Display Selected Trends */}
//       <div className="space-y-2">
//         {selectedTrends.map((trend) => {
//           // Transform the original trend data based on the current demographic filter
//           const modifiedData = modifyDataForDemographic(trend.data);
//           // Prepare data for the Recharts component (an array of objects)
//           const chartData = modifiedData.map((val, index) => ({
//             name: `Point ${index + 1}`,
//             value: val,
//           }));

//           return (
//             <div
//               key={trend.value}
//               className="p-2 bg-gray-100 rounded flex justify-between items-center"
//             >
//               <div>
//                 <p className="font-semibold">{trend.label}</p>
//                 <p
//                   className={`text-sm ${
//                     trend.change >= 0 ? "text-green-600" : "text-red-600"
//                   }`}
//                 >
//                   {trend.change >= 0 ? `+${trend.change}%` : `${trend.change}%`}
//                 </p>
//                 {/* Render a simple line chart using the filtered data */}
//                 <div className="mt-2 w-48 h-16">
//                   <ResponsiveContainer>
//                     <LineChart data={chartData}>
//                       <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
//                     </LineChart>
//                   </ResponsiveContainer>
//                 </div>
//               </div>
//               <button
//                 onClick={() => handleRemoveTrend(trend.value)}
//                 className="bg-red-500 text-white px-2 py-1 rounded"
//               >
//                 Remove
//               </button>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default TrendsWidget;
