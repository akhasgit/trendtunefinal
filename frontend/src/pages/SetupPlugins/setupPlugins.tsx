// src/pages/SetupPlugins.tsx
import React from 'react';

// Define the Plugin interface locally
interface Plugin {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
}

// Local list of plugins; replace with real data or import from a separate file if preferred
const pluginList: Plugin[] = [
  {
    id: 1,
    name: 'Shopify',
    description: 'Syncs your Shopify store’s products, orders, and customer data.',
    imageUrl: './plugin_images/shopify.png  ',
  },
  {
    id: 2,
    name: 'MailChimp',
    description: 'For targeted email campaigns & segmentation and automated workflows & triggers.',
    imageUrl: './plugin_images/mailchimp.png',
  },
  
  {
    id: 3,
    name: 'PowerBi',
    description: 'Embeds live BI dashboards and analytics',
    imageUrl: './plugin_images/powerbi.png',
  },
  {
    id: 4,
    name: 'POS',
    description: 'Connects your POS for sales and inventory sync',
    imageUrl: './plugin_images/POS.png',
  },
  {
    id: 5,
    name: 'Semrush',
    description: 'Offers SEO audits, keyword research, and competitor analysis',
    imageUrl: './plugin_images/semrush.png',
  },
  {
    id: 6,
    name: 'HootSuite',
    description: ' Manages scheduled social media posts across platforms',
    imageUrl: './plugin_images/hootsuite.png',
  },
  
  
];

const SetupPlugins: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6">Setup Plugins</h1>
      <div className="grid grid-cols-3 gap-6">
        {pluginList.map((plugin) => (
          <div
            key={plugin.id}
            className="border rounded-lg p-4 flex flex-col items-center"
          >
            <img
              src={plugin.imageUrl}
              alt={plugin.name}
              className="w-24 h-24 object-cover rounded-md mb-4"
            />
            <h2 className="text-xl font-medium mb-2">{plugin.name}</h2>
            {/* <p className="text-center text-sm mb-4">{plugin.description}</p> */}
            <button
              className="mt-auto px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Add Plugin
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetupPlugins;
