// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Homepage/homepage";
import ProductsPage from "./pages/ProductsPage/productspage";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ChatPage from "./pages/Chat/ChatPage";
import FirstTimeUpload from "./components/csvUpload/firstTimeUpload";
import LandingPage from "./pages/landingPage/landingpage";
import AllQuickActionsPage from "./pages/AllQuickActionsPage"

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* When the user goes to "/", render HomePage */}
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Optional: catch-all to always render HomePage for any unknown URL */}
        <Route path="*" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="chat/:chatId" element={<ChatPage />} />
        <Route path="/first-upload" element={<FirstTimeUpload />} />
        <Route path="/landingpage" element={<LandingPage />} />
        <Route path="/all-quick-actions" element={<AllQuickActionsPage />} />

      </Routes>
    </Router>
  );
};

export default App;


// // src/App.tsx

// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import SignIn from "./pages/AuthPages/SignIn";
// import SignUp from "./pages/AuthPages/SignUp";
// import NotFound from "./pages/OtherPage/NotFound";
// import UserProfiles from "./pages/UserProfiles";
// import Videos from "./pages/UiElements/Videos";
// import Images from "./pages/UiElements/Images";
// import Alerts from "./pages/UiElements/Alerts";
// import Badges from "./pages/UiElements/Badges";
// import Avatars from "./pages/UiElements/Avatars";
// import Buttons from "./pages/UiElements/Buttons";
// import LineChart from "./pages/Charts/LineChart";
// import BarChart from "./pages/Charts/BarChart";
// import Calendar from "./pages/Calendar";
// import BasicTables from "./pages/Tables/BasicTables";
// import FormElements from "./pages/Forms/FormElements";
// import Blank from "./pages/Blank";
// import WidgetPage from "./pages/Widgets/widgetpage";
// import ProductsPage from "./pages/ProductsPage/productspage";
// import TrendsPage from "./pages/TrendsPage/trendspage";
// import TrendSearchPage from "./pages/TrendSearchPage/trendsSearchPage";
// import ReportsLibrary from "./pages/ReportLibrary/reportslibrary";
// import TrendsExpanded from "./pages/Widgets/trendsWidget/trendsWidgetExpanded";
// // import LandingPage from "./pages/AuthPages/LandingPage";
// import SubscriptionPlansPage from "./pages/Subscriptions/subscriptionsPlanPage";
// import Home from "./pages/Dashboard/Home";
// import ChatPage from "./pages/Chat/ChatPage";
// import AppLayout from "./layout/AppLayout";
// import { ScrollToTop } from "./components/common/ScrollToTop";
// import SetupPlugins from "./pages/SetupPlugins/setupPlugins";
// import HomePage from "./pages/Homepage/homepage";

// export default function App() {
//   return (
//     <Router>
//       <ScrollToTop />
//       <Routes>
//         {/* Public/auth routes */}
//         {/* <Route path="/waitlist" element={<LandingPage />} /> */}
//         <Route path="/signin" element={<SignIn />} />
//         <Route path="/signup" element={<SignUp />} />

//         {/* All private pages share AppLayout */}
//         <Route element={<AppLayout />}>
//           {/* Dashboard home (chat new or list) */}
//           <Route index element={<Home />} />

//           {/* Persisted chat sessions */}
//           <Route path="chat/:chatId" element={<ChatPage />} />

//           {/* Other dashboard pages */}
//           <Route path="profile" element={<UserProfiles />} />
//           <Route path="calendar" element={<Calendar />} />
//           <Route path="blank" element={<Blank />} />
//           <Route path="/products" element={<ProductsPage />} />
//           <Route path="trends" element={<TrendsPage />} />
//           <Route path="trendsearch" element={<TrendSearchPage />} />
//           <Route path="reports" element={<ReportsLibrary />} />
//           <Route path="reports/:chatId" element={<ReportsLibrary />} />
//           <Route path="trends-expanded" element={<TrendsExpanded />} />
//           <Route path="widgetpage" element={<WidgetPage />} />
//           <Route path="/setup-plugins" element={<SetupPlugins />} />
//           <Route path="subscriptions" element={<SubscriptionPlansPage />} />
//           <Route path ="/homepage" element={<HomePage />} />

//           {/* UI Elements */}
//           <Route path="alerts" element={<Alerts />} />
//           <Route path="avatars" element={<Avatars />} />
//           <Route path="badge" element={<Badges />} />
//           <Route path="buttons" element={<Buttons />} />
//           <Route path="images" element={<Images />} />
//           <Route path="videos" element={<Videos />} />

//           {/* Charts */}
//           <Route path="line-chart" element={<LineChart />} />
//           <Route path="bar-chart" element={<BarChart />} />

//           {/* Forms & Tables */}
//           <Route path="form-elements" element={<FormElements />} />
//           <Route path="basic-tables" element={<BasicTables />} />

//           {/* Catch‑all for any unmatched under layout */}
//           <Route path="*" element={<NotFound />} />
//         </Route>

//         {/* Global fallback */}
//         <Route path="*" element={<NotFound />} />
//       </Routes>
//     </Router>
//   );
// }
