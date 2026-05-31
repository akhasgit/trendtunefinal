import React from "react";

// Sample fashion highlight data
const highlights = [
  {
    title: "Oversized Jackets making a comeback this winter",
    affectedProducts: ["Men's Wool Coats", "Women's Parkas", "Unisex Puffers"],
    urgency: "High",
  },
  {
    title: "Metallics trending in spring collections",
    affectedProducts: ["Silver Heels", "Shiny Clutches", "Metallic Blazers"],
    urgency: "Medium",
  },
  {
    title: "Pastels fading out in favor of earthy tones",
    affectedProducts: ["Mint Tees", "Lavender Skirts", "Peach Dresses"],
    urgency: "Low",
  },
];

const getUrgencyIcon = (urgency: string) => {
  switch (urgency) {
    case "High":
      return "❗❗❗";
    case "Medium":
      return "❗❗";
    case "Low":
      return "❗";
    default:
      return "";
  }
};

const HighlightsWidget: React.FC = () => {
  return (
    <div className="bg-white text-black rounded-xl p-4 space-y-4 w-full">
      <h2 className="text-lg font-semibold">Top fashion highlights</h2>

      {highlights.map((highlight, index) => (
        <div key={index} className="flex justify-between items-start border-b border-gray-700 pb-3">
          <div className="flex-1 pr-2">
            <p className="font-medium text-black">{highlight.title}</p>
            <p className="text-sm text-gray-300">
              {highlight.affectedProducts.join(", ")}
            </p>
          </div>
          <div className="text-right text-red-400 text-lg font-bold min-w-[3ch]">
            {getUrgencyIcon(highlight.urgency)}
          </div>
        </div>
      ))}

      <div className="pt-2">
        <button className="text-black font-medium flex items-center gap-2 hover:underline">
          View more highlights <span className="text-xl">→</span>
        </button>
      </div>
    </div>
  );
};

export default HighlightsWidget;
