import React from "react";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        <div className="w-full h-full bg-[#fbf9f6] lg:w-1/2 flex items-center justify-center">
          {children}
        </div>
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-[#fbf9f6] dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center max-w-xs">
              <Link to="/" className="block mb-4">
                <img
                  width={231}
                  height={48}
                  src="/favicon.png"
                  alt="Logo"
                />
              </Link>
              <span
                className="font-bold text-black text-xl mb-2 text-center"
                tabIndex={0}
                aria-label="TrendTune"
              >
                TrendTune
              </span>
              <p className="text-center text-gray-400 dark:text-white/60">
                Revolutionising retail and commerce : from trend identification to execution, fully automated.
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}