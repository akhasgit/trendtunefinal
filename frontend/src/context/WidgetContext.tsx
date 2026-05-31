// src/context/WidgetContext.tsx
import  {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";

// Update the WidgetState type to include trendsWidget
type WidgetState = {
  ecommerceMetrics: boolean;
  monthlySalesChart: boolean;
  monthlyTarget: boolean;
  statisticsChart: boolean;
  demographicCard: boolean;
  recentOrders: boolean;
  trendsWidget: boolean; 
  highlightsWidget: boolean;
};

type WidgetContextType = {
  widgets: WidgetState;
  addWidget: (widget: keyof WidgetState) => void;
  removeWidget: (widget: keyof WidgetState) => void;
};

// Update default state to include trendsWidget (set to false by default)
const defaultState: WidgetState = {
  ecommerceMetrics: true,
  monthlySalesChart: true,
  monthlyTarget: true,
  statisticsChart: true,
  demographicCard: true,
  recentOrders: true,
  trendsWidget: false,
  highlightsWidget: false,
};

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

export const WidgetProvider = ({ children }: { children: ReactNode }) => {
  const [widgets, setWidgets] = useState<WidgetState>(() => {
    const stored = localStorage.getItem("widgets");
    if (stored) {
      try {
        return JSON.parse(stored) as WidgetState;
      } catch (error) {
        console.error("Error parsing stored widget state", error);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem("widgets", JSON.stringify(widgets));
  }, [widgets]);

  const addWidget = (widget: keyof WidgetState) => {
    setWidgets((prev) => ({ ...prev, [widget]: true }));
  };

  const removeWidget = (widget: keyof WidgetState) => {
    setWidgets((prev) => ({ ...prev, [widget]: false }));
  };

  return (
    <WidgetContext.Provider value={{ widgets, addWidget, removeWidget }}>
      {children}
    </WidgetContext.Provider>
  );
};

export const useWidgetContext = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidgetContext must be used within a WidgetProvider");
  }
  return context;
};



// // src/context/WidgetContext.tsx
// import React, {
//     createContext,
//     useState,
//     ReactNode,
//     useContext,
//     useEffect,
//   } from "react";
  
//   type WidgetState = {
//     ecommerceMetrics: boolean;
//     monthlySalesChart: boolean;
//     monthlyTarget: boolean;
//     statisticsChart: boolean;
//     demographicCard: boolean;
//     recentOrders: boolean;
//   };
  
//   type WidgetContextType = {
//     widgets: WidgetState;
//     addWidget: (widget: keyof WidgetState) => void;
//     removeWidget: (widget: keyof WidgetState) => void;
//   };
  
//   const defaultState: WidgetState = {
//     ecommerceMetrics: true,
//     monthlySalesChart: true,
//     monthlyTarget: true,
//     statisticsChart: true,
//     demographicCard: true,
//     recentOrders: true,
//   };
  
//   const WidgetContext = createContext<WidgetContextType | undefined>(undefined);
  
//   export const WidgetProvider = ({ children }: { children: ReactNode }) => {
//     const [widgets, setWidgets] = useState<WidgetState>(() => {
//       const stored = localStorage.getItem("widgets");
//       if (stored) {
//         try {
//           return JSON.parse(stored) as WidgetState;
//         } catch (error) {
//           console.error("Error parsing stored widget state", error);
//         }
//       }
//       return defaultState;
//     });
  
//     useEffect(() => {
//       localStorage.setItem("widgets", JSON.stringify(widgets));
//     }, [widgets]);
  
//     const addWidget = (widget: keyof WidgetState) => {
//       setWidgets((prev) => ({ ...prev, [widget]: true }));
//     };
  
//     const removeWidget = (widget: keyof WidgetState) => {
//       setWidgets((prev) => ({ ...prev, [widget]: false }));
//     };
  
//     return (
//       <WidgetContext.Provider value={{ widgets, addWidget, removeWidget }}>
//         {children}
//       </WidgetContext.Provider>
//     );
//   };
  
//   export const useWidgetContext = () => {
//     const context = useContext(WidgetContext);
//     if (!context) {
//       throw new Error("useWidgetContext must be used within a WidgetProvider");
//     }
//     return context;
//   };
  