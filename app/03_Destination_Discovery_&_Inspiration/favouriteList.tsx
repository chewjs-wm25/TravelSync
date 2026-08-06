import React from "react";

interface ChildProbs {
  isDrawerOpen: boolean;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function FavouriteList({
  isDrawerOpen,
  setIsDrawerOpen,
}: ChildProbs) {
  return (
    <>
      {/* 悬浮切换按钮 */}
      {!isDrawerOpen && (
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-primary-500 fixed right-8 bottom-8 z-40 flex items-center gap-2 rounded-full px-6 py-3 text-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            ></path>
          </svg>
          <span className="font-semibold">Bucket List (3)</span>
        </button>
      )}

      {/* 愿望清单抽屉 / 悬浮面板 */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-full transform flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-96 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
            <svg
              className="text-primary-500 h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              ></path>
            </svg>
            My Saved Items
          </h2>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 text-gray-500 transition-colors duration-150 hover:text-gray-800"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* 已保存项目列表 */}
          {[
            { name: "Grand National Museum", folder: "Cultural Trip" },
            { name: "Annual City Lantern Festival", folder: "Events" },
            { name: "Night Market Eats", folder: "Food" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border border-gray-200 p-4 transition-colors duration-150 hover:bg-gray-100"
            >
              <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gray-200"></div>
              <div className="flex-1">
                <h4 className="line-clamp-1 text-base font-semibold text-gray-800">
                  {item.name}
                </h4>
                <span className="mt-1 inline-block rounded-md bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {item.folder}
                </span>
              </div>
              <button className="text-gray-500 transition-colors duration-150 hover:text-[#ef4444]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* 批量导出 / 推送按钮 */}
        <div className="border-t border-gray-200 bg-white p-6">
          <button className="bg-primary-500 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
            Push to Route Planner
          </button>
          <p className="mt-3 text-center text-xs font-medium text-gray-500">
            Export 3 items to your itinerary planner
          </p>
        </div>
      </div>
    </>
  );
}
