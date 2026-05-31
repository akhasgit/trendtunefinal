import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { WidgetProvider } from "./context/WidgetContext"; // <-- import the WidgetProvider
// import HomePage from "./pages/Homepage/homepage.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <WidgetProvider>
        <AppWrapper>
          <App />
           
           {/* <HomePage /> */}
        </AppWrapper>
      </WidgetProvider>
    </ThemeProvider>
  </StrictMode>,
);
