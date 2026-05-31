import React, { useState, useEffect, useRef, FormEvent } from "react";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ChartBarIcon,
  ListBulletIcon,
  MagnifyingGlassCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAnonymousAuth } from "../../hooks/useAnonymousAuth";
import axios from "axios";
import qs from "qs";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend
);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://agenticchattt-310229311797.asia-southeast1.run.app";

export interface ChatPageProps {
  chatId?: string | null;
  setChatId?: React.Dispatch<React.SetStateAction<string | null>>;
}

interface QuickPromptButtonProps {
  label: string;
  Icon: React.ElementType;
  onClick: () => void;
}
const QuickPromptButton: React.FC<QuickPromptButtonProps> = ({
  label,
  Icon,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200
               focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800"
    aria-label={label}
  >
    <Icon className="w-5 h-5" />
    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
  </button>
);

const LineChartComponent: React.FC<{
  data: number[];
  labels: string[];
  xLabel: string;
  yLabel: string;
}> = ({ data, labels, xLabel, yLabel }) => {
  const firstData = data.map((v, idx) => (idx < 12 ? v : null));
  const secondData = data.map((v, idx) => (idx >= 11 ? v : null));

  const chartData = {
    labels,
    datasets: [
      {
        label: yLabel,
        data: firstData,
        fill: false,
        borderColor: "blue",
        pointBackgroundColor: "blue",
        pointBorderColor: "blue",
        tension: 0.3,
      },
      {
        label: yLabel,
        data: secondData,
        fill: false,
        borderColor: "green",
        pointBackgroundColor: "green",
        pointBorderColor: "green",
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { title: { display: true, text: xLabel } },
      y: { title: { display: true, text: yLabel } },
    },
  };

  return <Line data={chartData} options={options} />;
};

const ChatPage: React.FC<ChatPageProps> = (props) => {
  const { chatId: propChatId, setChatId: propSetChatId } = props;
  const { chatId: paramChatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAnonymousAuth();

  const chatId = propChatId ?? paramChatId ?? null;
  const setChatId =
    propSetChatId ??
    ((id: string | null) => {
      if (id) navigate(`/chat/${id}`, { replace: true });
      else navigate("/", { replace: true });
    });

  type Msg = {
    id: string;
    sender: "user" | "bot";
    content: string;
    timestamp: Date;
  };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const greetings = [
    "Hello, how can we help you today?",
    "Welcome back! What can I do for you?",
    "Hi there! Ready to explore some insights?",
    "Good day! How can I assist you now?",
    "Hey! What would you like to talk about?",
    "Greetings! What's on your mind today?",
    "Hello! Need any help finding trends?",
    "Hi! How can I make your day easier?",
    "Welcome! What questions can I answer?",
    "Hey there! Let's get started—how can I help?",
  ];
  const [greetingIndex] = useState<number>(
    () => Math.floor(Math.random() * greetings.length)
  );

  const typingMessages = [
    "Analyzing market data...",
    "Reading through product insights...",
    "Identifying key trends...",
    "Tailoring recommendations...",
    "Generating personalized insights...",
  ];
  const [currentTypingMessage, setCurrentTypingMessage] = useState(
    typingMessages[0]
  );

  useEffect(() => {
    if (!chatId || !user) {
      setMessages([]);
      return;
    }
    const msgsCol = collection(
      db,
      "Sessions",
      user.uid,
      "chats",
      chatId,
      "messages"
    );
    const q = query(msgsCol, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            sender: data.sender,
            content: data.content,
            timestamp: data.timestamp?.toDate?.() ?? new Date(),
          };
        })
      );
    });
    return unsub;
  }, [chatId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        setCurrentTypingMessage(
          typingMessages[Math.floor(Math.random() * typingMessages.length)]
        );
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isTyping]);

  const fetchBotResponse = async (
    userMessage: string,
    userid: string,
    chatId: string
  ): Promise<string> => {
    const formData = qs.stringify({ userid, chatId, prompt: userMessage });
    try {
      const response = await axios.post(`${API_BASE}/ask_ai`, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      });
      return response.data.response ?? response.data ?? "No reply.";
    } catch (error: any) {
      console.error("Axios error:", error);
      return "Failed to process your request.";
    }
  };

  const summary = async (
    userMessage: string,
    userid: string,
    chatId: string
  ): Promise<string> => {
    const formData = qs.stringify({ userid, chatId, prompt: userMessage });
    try {
      const response = await axios.post(`${API_BASE}/generate_summary`, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      });
      return response.data.response ?? response.data ?? "No reply.";
    } catch (error: any) {
      console.error("Axios error:", error);
      return "Failed to process your request.";
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || !user) return;

    const optimisticMsg: Msg = {
      id: `temp-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      let id = chatId;

      if (!id) {
        const chatsCol = collection(db, "Sessions", user.uid, "chats");
        const newChatRef = doc(chatsCol);
        id = newChatRef.id;
        setChatId(id);

        await setDoc(newChatRef, {
          chat_summary: text,
          last_chat_session: text,
          chat_trends_covered: [],
          created_at: serverTimestamp(),
        });
      }

      const msgCol = collection(
        db,
        "Sessions",
        user.uid,
        "chats",
        id,
        "messages"
      );
      await addDoc(msgCol, {
        sender: "user",
        content: text,
        timestamp: serverTimestamp(),
        rated: null,
      });

      const botReply = await fetchBotResponse(text, user.uid, id);
      setIsTyping(false);
      await addDoc(msgCol, {
        sender: "bot",
        content: botReply,
        timestamp: serverTimestamp(),
        rated: null,
      });
    } catch (err) {
      console.error("Chat send failed:", err);
      setIsTyping(false);
    }
  };

  const handleGenerateReportClick = async () => {
    if (!user || !chatId) return;

    const msgCol = collection(db, "Sessions", user.uid, "chats", chatId, "messages");
    await addDoc(msgCol, {
      sender: "user",
      content: "Generate a report of the conversation summarising key points in bullet format",
      timestamp: serverTimestamp(),
      rated: null,
    });

    setIsTyping(true);
    const botReply = await summary(
      "Generate a report of the conversation summarising key points in bullet format",
      user.uid,
      chatId
    );
    setIsTyping(false);

    await addDoc(msgCol, {
      sender: "bot",
      content: botReply,
      timestamp: serverTimestamp(),
      rated: null,
    });

    const reportRef = doc(db, "reports", user.uid, "chatGeneratedReports", chatId);
    await setDoc(reportRef, {
      chatId,
      content: botReply,
      reportName: "Generated Report",
      sender: "bot",
      timestamp: serverTimestamp(),
    });
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    setTimeout(() => {
      handleSend({ preventDefault: () => {} } as unknown as FormEvent);
    }, 0);
  };

  const renderBotContent = (content: string) => {
    const tableRegex = /\\t([\s\S]*?)\\tx/;
    const tableMatch = content.match(tableRegex);
    if (tableMatch) {
      try {
        const tableInner = tableMatch[1].trim();
        const { columns, rows } = JSON.parse(tableInner);
        const before = content.slice(0, tableMatch.index);
        const after = content.slice((tableMatch.index || 0) + tableMatch[0].length);
        return (
          <>
            {before && renderBotContent(before)}
            <div className="my-4 overflow-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
                <thead>
                  <tr>
                    {columns.map((col: string) => (
                      <th key={col} className="px-4 py-2 text-left text-sm font-medium text-gray-600 bg-gray-100">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any[], idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {row.map((cell: any, j: number) => (
                        <td key={j} className="px-4 py-2 text-sm text-gray-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {after && renderBotContent(after)}
          </>
        );
      } catch {
        /* fall through to markdown */
      }
    }

    const chartRegex = /\\c([\s\S]*?)\\cx/;
    const match = content.match(chartRegex);
    if (match) {
      try {
        const inner = match[1].trim();
        const parts = inner.split(/\],\s*(?=\[)/);
        if (parts.length >= 2) {
          const dataArray = JSON.parse(parts[0] + "]");
          const labelsArray = JSON.parse(parts[1]);
          const [yLabel, xLabel] = labelsArray as [string, string];
          const xValues = (dataArray as number[]).map((_, i) => `${i + 1}`);

          const markdownWithoutChart = content.replace(chartRegex, "");
          return (
            <>
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {markdownWithoutChart}
              </ReactMarkdown>
              <div className="mt-4">
                <LineChartComponent
                  data={dataArray as number[]}
                  labels={xValues}
                  xLabel={xLabel}
                  yLabel={yLabel}
                />
              </div>
            </>
          );
        }
      } catch {
        /* fall through to markdown */
      }
    }

    return (
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex flex-col bg-white-200">
      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="flex flex-col w-full max-h max-w rounded-xl h-[80vh]">
          <div className="flex-1 overflow-y-auto mb-4 relative">
            {messages.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none text-black-400 text-xl">
                <span>{greetings[greetingIndex]}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pointer-events-auto">
                  <QuickPromptButton
                    label="Show me the latest trends in my industry"
                    Icon={ChartBarIcon}
                    onClick={() => handleQuickPrompt("Show me the latest trends in my industry")}
                  />
                  <QuickPromptButton
                    label="What are the top products in my SKU I should sell"
                    Icon={ListBulletIcon}
                    onClick={() => handleQuickPrompt("What are the top products in my SKU I should sell")}
                  />
                  <QuickPromptButton
                    label="What are the trends that are relevant to my product SKU"
                    Icon={MagnifyingGlassCircleIcon}
                    onClick={() => handleQuickPrompt("What are the trends that are relevant to my product SKU")}
                  />
                  <QuickPromptButton
                    label="Pick a random product and show me a new target segment"
                    Icon={UserGroupIcon}
                    onClick={() =>
                      handleQuickPrompt(
                        "Pick a random product from my product list and show me a new target segment I can focus on for it"
                      )
                    }
                  />
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`my-2 flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white-200 text-gray-900"
                  }`}
                >
                  {m.sender === "bot" ? renderBotContent(m.content) : m.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="my-2 flex justify-start">
                <div className="p-3 rounded-lg bg-white-200 text-white-900 max-w-[80%]">
                  <div className="text-sm text-black-600 font-medium">
                    {currentTypingMessage}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center space-x-2 bg-white">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={chatId ? "Type a message..." : "What can I help you with today?"}
              className="flex-1 rounded-lg p-3 border border-gray-600 text-gray-900 placeholder-gray-500 shadow-none focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="Type your message"
              tabIndex={0}
            />

            {isTyping ? (
              <div className="p-3">
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            ) : (
              <button
                type="submit"
                className="p-3 rounded-lg bg-transparent hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="w-6 h-6 text-blue-600 -rotate-45" />
              </button>
            )}

            {chatId && (
              <button
                type="button"
                onClick={handleGenerateReportClick}
                aria-label="Generate"
                className="group inline-flex items-center gap-2 p-3 rounded-lg
                           bg-transparent hover:bg-green-50 focus:outline-none focus:ring-2
                           focus:ring-green-500 transition"
              >
                <SparklesIcon className="w-8 h-8 text-green-600" />
                <span className="hidden text-green-600 font-medium group-hover:inline group-focus:inline">
                  Generate Report
                </span>
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;
