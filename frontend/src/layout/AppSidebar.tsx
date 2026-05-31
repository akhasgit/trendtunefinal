// src/layout/AppSidebar.tsx

import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { auth, db } from "../firebase/firebase";
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";
import { useAnonymousAuth } from "../hooks/useAnonymousAuth";

import { GridIcon, BoxCubeIcon, PlugInIcon, TrendsIcon } from "../icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

type ChatItem = {
  id: string;
  title: string;
};

const menuItems: NavItem[] = [
  { name: "Setup Plugins", icon: <PlugInIcon />, path: "/setup-plugins" },
  { name: "My Products",   icon: <BoxCubeIcon />, path: "/products"  },
  { name: "Reports Library",    icon: <GridIcon />,    path: "/reports"   },
  { name: "Trends",    icon: <TrendsIcon />,    path: "/trends"   },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const { user } = useAnonymousAuth();

  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    const chatsCol = collection(db, "Sessions", user.uid, "chats");
    const unsub = onSnapshot(chatsCol, (snap) => {
      setChats(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title:
              data.chat_summary ||
              data.last_chat_session ||
              `Chat ${d.id.slice(0, 5)}`,
          };
        })
      );
    });
    return unsub;
  }, [user]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const handleEditClick = (chat: ChatItem) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value);
  };

  const handleTitleSubmit = async (chatId: string) => {
    if (!user) return;
    const chatRef = doc(db, "Sessions", user.uid, "chats", chatId);
    await setDoc(chatRef, { chat_summary: editingTitle }, { merge: true });
    setEditingChatId(null);
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 text-gray-900 transition-all duration-300 z-50
        ${isExpanded || isHovered || isMobileOpen ? "w-64" : "w-16"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="py-8 px-14 flex items-center justify-center lg:justify-start">
        {(isExpanded || isHovered || isMobileOpen) && (
          <img src="/favicon.png" alt="Logo" className="w-30 h-30" />
        )}
      </div>

      <nav className="px-4">
        <ul className="space-y-4">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800
                  ${isActive(item.path) ? "bg-gray-200 dark:bg-gray-700" : ""}`}
              >
                <span className="w-6 h-6">{item.icon}</span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="ml-3 text-sm font-medium">{item.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Real chat sessions */}
        <div className="mt-8">
          {(isExpanded || isHovered || isMobileOpen) && (
            <h2 className="text-xs uppercase text-gray-400 mb-2">Sessions</h2>
          )}
          <ul className="space-y-2">
            {chats.map((chat) => (
              <li key={chat.id}>
                {editingChatId === chat.id ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={handleTitleChange}
                      className="flex-1 border rounded-lg p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      onBlur={() => handleTitleSubmit(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleSubmit(chat.id);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                  </div>
                ) : (
                  <Link
                    to={`/chat/${chat.id}`}
                    className={`flex items-center p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800
                      ${location.pathname === `/chat/${chat.id}`
                        ? "bg-gray-200 dark:bg-gray-700"
                        : ""
                      }`}
                    onClick={() => handleEditClick(chat)}
                  >
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="ml-3 text-sm">{chat.title}</span>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default AppSidebar;
