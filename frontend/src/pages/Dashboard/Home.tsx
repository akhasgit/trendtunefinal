// src/pages/Dashboard/Home.tsx

import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import AppHeader from "../../layout/AppHeader";
import ReportsLibrary from "../ReportLibrary/reportslibrary";
import TrendsPage from "../TrendsPage/trendspage";
import ChatPage from "../Chat/ChatPage";
import DemographicResultsTable from "../../components/DemographicResultsTable";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<"chat" | "reports" | "trends">("chat");
  const [chatId, setChatId] = useState<string | null>(null);

  const handleNewChat = () => {
    setChatId(null);
    setCurrentTab("chat");
  };

  return (
    <div className="flex flex-col h-full">
      <PageMeta title="Home" description="TrendTune" />

      {/* Pass onNewChat so the green + button in AppHeader works */}
      {/* <AppHeader
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onNewChat={handleNewChat}
      /> */}



      <div className="flex-1 p-4 flex flex-col overflow-hidden">
        {currentTab === "chat" && (
          <ChatPage chatId={chatId} setChatId={setChatId} />
        )}
        {currentTab === "reports" && <ReportsLibrary />}
        {currentTab === "trends"   && <TrendsPage />}
      </div>
    </div>
  );
}


// import React, { useState } from "react";
// import PageMeta from "../../components/common/PageMeta";
// import AppHeader from "../../layout/AppHeader";
// import ReportsLibrary from "../ReportLibrary/reportslibrary";
// import TrendsPage from "../TrendsPage/trendspage";
// import ChatPage from "../ChatPage";

// const Home: React.FC = () => {
//   const [currentTab, setCurrentTab] = useState<"chat" | "reports" | "trends">(
//     "chat"
//   );

//   return (
//     <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
//       <PageMeta title="Home" description="TrendTune" />
//       <AppHeader currentTab={currentTab} setCurrentTab={setCurrentTab} onNewChat={handleNewChat}  />

//       <div className="flex-1 overflow-auto p-4">
//         {currentTab === "chat" && <ChatPage />}
//         {currentTab === "reports" && <ReportsLibrary />}
//         {currentTab === "trends" && <TrendsPage />}
//       </div>
//     </div>
//   );
// };

// export default Home;
