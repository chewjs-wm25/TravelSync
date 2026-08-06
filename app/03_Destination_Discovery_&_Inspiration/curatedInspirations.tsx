export default function CuratedInspirations() {
  return (
    <section className="space-y-6">
      {/* 主题合集轮播 */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          Curated Inspirations
        </h2>
        <div className="flex snap-x gap-4 overflow-x-auto pb-4 md:gap-6">
          {[
            {
              title: "Historic District Walking Guide",
              img: "bg-accent-400/20",
            },
            { title: "Local Culinary Secrets", img: "bg-secondary-500/20" },
            { title: "Art & Museum Hopping", img: "bg-primary-500/20" },
          ].map((item, i) => (
            <div
              key={i}
              className={`h-40 min-w-[280px] ${item.img} relative flex cursor-pointer snap-center items-end overflow-hidden rounded-3xl border border-gray-200 p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gray-800/60 to-transparent"></div>
              <h3 className="relative z-10 text-xl font-semibold text-white">
                {item.title}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* 活动与节日区域（含周边推荐） */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          Upcoming Festivals & Events
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <span className="bg-primary-500/10 text-primary-500 mb-2 inline-block rounded-md px-2 py-1 text-xs font-semibold">
                  Sep 15 - Sep 20
                </span>
                <h3 className="text-xl font-semibold text-gray-800">
                  Annual City Lantern Festival
                </h3>
              </div>
            </div>
            <p className="mb-4 text-base text-gray-500">
              Experience the spectacular light show at the central plaza.
            </p>

            {/* 周边推荐组件 */}
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                <svg
                  className="text-secondary-500 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
                Nearby Recommendations
              </h4>
              <div className="flex gap-2">
                <span className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm">
                  🏨 Plaza Hotel (0.2km)
                </span>
                <span className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm">
                  🍜 Night Market Eats (0.1km)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
