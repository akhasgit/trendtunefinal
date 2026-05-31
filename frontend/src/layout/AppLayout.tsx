// src/layout/AppLayout.tsx

import React from "react";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const TABS = ["chat", "reports", "trends"] as const;
type Tab = typeof TABS[number];

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Determine which tab is active based on the first segment of the path:
  const root = pathname.split("/")[1] || "";
  const currentTab: Tab = TABS.includes(root as Tab) ? (root as Tab) : "chat";

  const handleTabChange = (tab: Tab) => {
    // navigate to the right base path
    if (tab === "chat") navigate("/", { replace: true });
    else navigate(`/${tab}`, { replace: true });
  };

  const handleNewChat = () => {
    // reset to chat home (no chatId in URL)
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar + backdrop */}
      <AppSidebar />
      <Backdrop />

      {/* Main content */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out 
          ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"} 
          ${isMobileOpen ? "ml-0" : ""}`}
      >
        {/* Always show header */}
        <AppHeader
          currentTab={currentTab}
          setCurrentTab={handleTabChange}
          onNewChat={handleNewChat}
        />

        {/* Page content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => (
  <SidebarProvider>
    <LayoutContent />
  </SidebarProvider>
);

export default AppLayout;



// import { SidebarProvider, useSidebar } from "../context/SidebarContext";
// import { Outlet } from "react-router";
// import AppHeader from "./AppHeader";
// import Backdrop from "./Backdrop";
// import AppSidebar from "./AppSidebar";
// // import AppSidebar from "./AppSidebar";

// const LayoutContent: React.FC = () => {
//   const { isExpanded, isHovered, isMobileOpen } = useSidebar();

//   return (
//     <div className="min-h-screen xl:flex">
//       <div>
//         <AppSidebar />
//         <Backdrop />
//       </div>
//       <div
//         className={`flex-1 transition-all duration-300 ease-in-out ${
//           isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
//         } ${isMobileOpen ? "ml-0" : ""}`}
//       >
//         {/* <AppHeader /> */}
//         <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
//           <Outlet />
//         </div>
//       </div>
//     </div>
//   );
// };

// const AppLayout: React.FC = () => {
//   return (
//     <SidebarProvider>
//       <LayoutContent />
//     </SidebarProvider>
//   );
// };

// export default AppLayout;
