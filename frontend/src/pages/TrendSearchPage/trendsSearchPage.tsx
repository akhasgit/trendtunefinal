import React, { useState } from "react";

const sampleTrends = [
  "React.js",
  "JavaScript",
  "CSS",
  "Node.js",
  "TypeScript",
  "Tailwind CSS",
];

const TrendSearchPage: React.FC = () => {
  const [trackedTrends, setTrackedTrends] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter sample trends based on the search query and exclude already tracked trends.
  const filteredTrends = sampleTrends
    .filter((trend) =>
      trend.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((trend) => !trackedTrends.includes(trend));

  const handleAddTrend = (trend: string) => {
    setTrackedTrends((prev) => [...prev, trend]);
    // Close the adding interface and clear the search.
    setIsAdding(false);
    setSearchQuery("");
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Trends Page</h1>

      {/* Display the list of tracked trends */}
      <div className="mb-4">
        {trackedTrends.length === 0 ? (
          <p>No trends are being tracked yet.</p>
        ) : (
          <ul className="list-disc pl-5">
            {trackedTrends.map((trend, index) => (
              <li key={index} className="py-1">
                {trend}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Button to open the add trend interface */}
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <span className="mr-2">+</span> Add Trend
      </button>

      {/* When in adding mode, show the search and sample list */}
      {isAdding && (
        <div className="mt-4 border p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Add a Trend Tracker</h2>
          <input
            type="text"
            placeholder="Search trends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          {filteredTrends.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredTrends.map((trend, index) => (
                <li
                  key={index}
                  onClick={() => handleAddTrend(trend)}
                  className="cursor-pointer p-2 hover:bg-gray-100"
                >
                  {trend}
                </li>
              ))}
            </ul>
          ) : (
            <p>No trends found.</p>
          )}
          <button
            onClick={() => {
              setIsAdding(false);
              setSearchQuery("");
            }}
            className="mt-2 text-red-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default TrendSearchPage;
