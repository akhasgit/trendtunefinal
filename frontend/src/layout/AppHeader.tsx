// src/layout/AppHeader.tsx

import React from "react";
import { useSidebar } from "../context/SidebarContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import NotificationDropdown from "../components/header/NotificationDropdown";
import UserDropdown from "../components/header/UserDropdown";
import { useNavigate, useLocation } from "react-router-dom";

// ← new imports
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

interface AppHeaderProps {
  currentTab: "chat" | "reports" | "trends";
  setCurrentTab: (tab: "chat" | "reports" | "trends") => void;
  onNewChat: () => void;
}

const TABS: { label: string; id: "chat" | "reports" | "trends" }[] = [
  { label: "Chat",    id: "chat"    },
  { label: "Reports", id: "reports" },
  { label: "Trends",  id: "trends"  },
];

const AppHeader: React.FC<AppHeaderProps> = ({
  currentTab,
  setCurrentTab,
  onNewChat,
}) => {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  const activeIndex = TABS.findIndex((t) => t.id === currentTab);

  // ← NEW: Check plan and chat count before calling onNewChat
  const handleNewChatClick = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be signed in to start a chat.");
      return;
    }

    try {
      // 1. fetch current_plan
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const plan = userSnap.data()?.current_plan as string;

      if (plan === "free") {
        // 2. count existing chats
        const chatsSnap = await getDocs(
          collection(db, "Sessions", user.uid, "chats")
        );
        if (chatsSnap.size >= 5) {
          alert("Upgrade to access unlimited chats.");
          return;
        }
      }

      // allowed: switch tab & invoke new-chat logic
      setCurrentTab("chat");
      onNewChat();
    } catch (err) {
      console.error("Error checking plan/chat count:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Sidebar toggle */}
        <button
          onClick={handleToggle}
          className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400 rounded-lg border dark:border-gray-800"
          aria-label="Toggle Sidebar"
        >
          <span className="sr-only">Toggle sidebar</span>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path
              fill="currentColor"
              d="M0.583 1C0.583 0.586 0.919 0.25 1.333 0.25h13.333c.415 0 .75.336.75.75s-.335.75-.75.75H1.333a.75.75 0 0 1-.75-.75zM0.583 11c0-.414.336-.75.75-.75h13.333c.415 0 .75.336.75.75s-.335.75-.75.75H1.333a.75.75 0 0 1-.75-.75zM1.333 5.25a.75.75 0 0 0 0 1.5h6.667a.75.75 0 0 0 0-1.5H1.333z"
            />
          </svg>
        </button>

        {/* Tab selector */}
        <div className="relative inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.4">
          <div
            className="absolute inset-y-0 w-1/3 bg-blue-600 rounded-lg transition-transform"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "reports") {
                  const chatMatch = location.pathname.match(/^\/chat\/([^/]+)/);
                  if (chatMatch) {
                    navigate(`/reports/${chatMatch[1]}`);
                  } else {
                    navigate("/reports");
                  }
                } else if (tab.id === "chat") {
                  const reportMatch = location.pathname.match(
                    /^\/reports\/([^/]+)/
                  );
                  if (reportMatch) {
                    navigate(`/chat/${reportMatch[1]}`);
                  } else {
                    navigate("/");
                  }
                } else {
                  setCurrentTab(tab.id);
                }
              }}
              className={`relative z-10 flex-1 text-center py-2 px-4 text-sm font-medium transition-colors ${
                currentTab === tab.id
                  ? "text-white"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-3">
          {/* <ThemeToggleButton /> */}

          {/* New Chat button */}
          <button
            onClick={handleNewChatClick}  // ← updated handler
            className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400 rounded-lg border dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="New Chat"
          >
            <span className="sr-only">New Chat</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* <NotificationDropdown /> */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;


// // src/layout/AppHeader.tsx

// import React from "react";
// import { useSidebar } from "../context/SidebarContext";
// import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
// import NotificationDropdown from "../components/header/NotificationDropdown";
// import UserDropdown from "../components/header/UserDropdown";
// import { useNavigate, useLocation } from "react-router-dom";

// interface AppHeaderProps {
//   currentTab: "chat" | "reports" | "trends";
//   setCurrentTab: (tab: "chat" | "reports" | "trends") => void;
//   onNewChat: () => void;        // ← add this
// }

// const TABS: { label: string; id: "chat" | "reports" | "trends" }[] = [
//   { label: "Chat",    id: "chat"    },
//   { label: "Reports", id: "reports" },
//   { label: "Trends",  id: "trends"  },
// ];

// const AppHeader: React.FC<AppHeaderProps> = ({
//   currentTab,
//   setCurrentTab,
//   onNewChat,               // ← destructure here
// }) => {
//   const { toggleSidebar, toggleMobileSidebar } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const handleToggle = () => {
//     if (window.innerWidth >= 1024) toggleSidebar();
//     else toggleMobileSidebar();
//   };
//   const activeIndex = TABS.findIndex((t) => t.id === currentTab);

//   return (
//     <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b dark:border-gray-800">
//       <div className="flex items-center justify-between px-4 py-3 lg:px-6">
//         {/* Sidebar toggle */}
//         <button
//           onClick={handleToggle}
//           className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400 rounded-lg border dark:border-gray-800"
//           aria-label="Toggle Sidebar"
//         >
//           <span className="sr-only">Toggle sidebar</span>
//           <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
//             <path
//               fill="currentColor"
//               d="M0.583 1C0.583 0.586 0.919 0.25 1.333 0.25h13.333c.415 0 .75.336.75.75s-.335.75-.75.75H1.333a.75.75 0 0 1-.75-.75zM0.583 11c0-.414.336-.75.75-.75h13.333c.415 0 .75.336.75.75s-.335.75-.75.75H1.333a.75.75 0 0 1-.75-.75zM1.333 5.25a.75.75 0 0 0 0 1.5h6.667a.75.75 0 0 0 0-1.5H1.333z"
//             />
//           </svg>
//         </button>

//         {/* Tab selector */}
//         <div className="relative inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.4">
//           <div
//             className="absolute inset-y-0 w-1/3 bg-blue-600 rounded-lg transition-transform"
//             style={{ transform: `translateX(${activeIndex * 100}%)` }}
//           />
//           {TABS.map((tab) => (
//             <button
//               key={tab.id}
//               onClick={() => {
//                 if (tab.id === "reports") {
//                   const chatMatch = location.pathname.match(/^\/chat\/([^/]+)/);
//                   if (chatMatch) {
//                     navigate(`/reports/${chatMatch[1]}`);
//                   } else {
//                     navigate("/reports");
//                   }
//                 } else if (tab.id === "chat") {
//                   const reportMatch = location.pathname.match(/^\/reports\/([^/]+)/);
//                   if (reportMatch) {
//                     navigate(`/chat/${reportMatch[1]}`);
//                   } else {
//                     navigate("/");
//                   }
//                 } else {
//                   setCurrentTab(tab.id);
//                 }
//               }}
//               className={`relative z-10 flex-1 text-center py-2 px-4 text-sm font-medium transition-colors ${
//                 currentTab === tab.id
//                   ? "text-white"
//                   : "text-gray-700 dark:text-gray-200"
//               }`}
//             >
//               {tab.label}
//             </button>
//           ))}
//         </div>

//         {/* Right‑side controls */}
//         <div className="flex items-center gap-3">
//           {/* <ThemeToggleButton /> */}

//           {/* New Chat button */}
//           <button
//             onClick={() => {
//               setCurrentTab("chat");
//               onNewChat();
//             }}
//             className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400 rounded-lg border dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
//             title="New Chat"
//           >
//             <span className="sr-only">New Chat</span>
//             <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
//               <path
//                 d="M10 4v12M4 10h12"
//                 stroke="currentColor"
//                 strokeWidth="2"
//                 strokeLinecap="round"
//               />
//             </svg>
//           </button>

//           {/* <NotificationDropdown /> */}
//           <UserDropdown />
//         </div>
//       </div>
//     </header>
//   );
// };

// export default AppHeader;


// import React from "react";
// import { useSidebar } from "../context/SidebarContext";
// import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
// import NotificationDropdown from "../components/header/NotificationDropdown";
// import UserDropdown from "../components/header/UserDropdown";

// interface AppHeaderProps {
//   currentTab: "chat" | "reports" | "trends";
//   setCurrentTab: (tab: "chat" | "reports" | "trends") => void;
// }

// const TABS: { label: string; id: "chat" | "reports" | "trends" }[] = [
//   { label: "Chat", id: "chat" },
//   { label: "Reports", id: "reports" },
//   { label: "Trends", id: "trends" },
// ];

// const AppHeader: React.FC<AppHeaderProps> = ({ currentTab, setCurrentTab }) => {
//   const { toggleSidebar, toggleMobileSidebar } = useSidebar();

//   const handleToggle = () => {
//     if (window.innerWidth >= 1024) {
//       toggleSidebar();
//     } else {
//       toggleMobileSidebar();
//     }
//   };

//   const activeIndex = TABS.findIndex((t) => t.id === currentTab);

//   return (
//     <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b dark:border-gray-800">
//       <div className="flex items-center justify-between px-4 py-3 lg:px-6">
//         {/* Sidebar toggle */}
//         <button
//           onClick={handleToggle}
//           className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400 dark:border-gray-800 rounded-lg border"
//           aria-label="Toggle Sidebar"
//         >
//           <span className="sr-only">Toggle sidebar</span>
//           <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
//             <path
//               fill="currentColor"
//               fillRule="evenodd"
//               clipRule="evenodd"
//               d="M0.583 1C0.583 0.586 0.919 0.25 1.333 0.25h13.333c.415 0 .75.336.75.75s-.335.75-.75.75H1.333a.75.75 0 0 1-.75-.75zM0.583 11c0-.414.336-.75.75-.75h13.333c.415 0 .75.336.75.75s-.335.75-.75.75H1.333a.75.75 0 0 1-.75-.75zM1.333 5.25a.75.75 0 0 0 0 1.5h6.667a.75.75 0 0 0 0-1.5H1.333z"
//             />
//           </svg>
//         </button>

//         {/* Segmented Toggle Control */}
//         <div className="relative inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.4">
//           {/* Sliding active background */}
//           <div
//             className="absolute inset-y-0 w-1/3 bg-blue-600 rounded-lg transition-transform"
//             style={{ transform: `translateX(${activeIndex * 100}%)` }}
//           />

//           {/* Tab Buttons */}
//           {TABS.map((tab) => (
//             <button
//               key={tab.id}
//               onClick={() => setCurrentTab(tab.id)}
//               className={`relative z-10 flex-1 text-center py-2 px-4 text-sm font-medium transition-colors
//                 ${currentTab === tab.id ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
//             >
//               {tab.label}
//             </button>
//           ))}
//         </div>

//         {/* Right-side actions */}
//         <div className="flex items-center gap-3">
//           <ThemeToggleButton />
//           <NotificationDropdown />
//           <UserDropdown />
//         </div>
//       </div>
//     </header>
//   );
// };

// export default AppHeader;
