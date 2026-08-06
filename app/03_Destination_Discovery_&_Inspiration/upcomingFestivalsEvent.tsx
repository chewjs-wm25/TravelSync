export default function UpcomingFestivalsEvent() {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">
          Recommended Places
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {/* POI 主卡片（跨度根据规范按屏幕尺寸调整） */}
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]"
          >
            {/* 带质量徽章的图片占位符 */}
            <div className="relative m-2 h-48 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              {/* 官方质量认证徽章 */}
              <div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-gray-800/90 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
                <svg
                  className="text-accent-400 h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                Platinum
              </div>
              {/* 收藏按钮 */}
              <button className="hover:text-primary-500 absolute top-3 right-3 rounded-full bg-white/90 p-2 text-gray-500 shadow-sm backdrop-blur-sm transition-colors duration-150 hover:bg-white">
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
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="p-6 pt-4">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                  Grand National Museum
                </h3>
              </div>

              {/* 营业状态与核心信息 */}
              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1 font-medium text-[#10b981]">
                  <span className="h-2 w-2 rounded-full bg-[#10b981]"></span>{" "}
                  Open Now
                </span>
                <span className="flex items-center gap-1">⏱️ 2-3 hrs</span>
                <span className="flex items-center gap-1">🎟️ $15</span>
              </div>

              {/* 设施与无障碍提示标签 */}
              <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                <span className="flex items-center gap-1 rounded-md border border-[#3b82f6]/20 bg-[#3b82f6]/10 px-2 py-1 text-xs text-[#3b82f6]">
                  ♿ Wheelchair Accessible
                </span>
                <span className="flex items-center gap-1 rounded-md border border-[#f59e0b]/20 bg-[#f59e0b]/10 px-2 py-1 text-xs text-[#f59e0b]">
                  ⚠️ Limited Parking
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
