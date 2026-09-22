import Header from "@/app/Header";
import Sidebar from "@/app/Sidebar";
import Footer from "@/app/Footer";

import "@/app/globals.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__cfBeacon = { spa: "false" };
              window.addEventListener('error', function(e) {
                if (e && e.message && (e.message.includes('startTime') || e.message.includes('reportAllChanges'))) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body>
        {/* 最外层改为 flex-col 垂直排列 */}
        <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
          {/* 1. Header 居顶贯穿整行 */}
          <Header />

          {/* 2. 中间主体区域（左 Sidebar，右 Main） */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />

            {/* 内容滚动区 */}
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto min-h-[calc(100vh-80px-70px)] w-full max-w-7xl px-4 py-8 md:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>

          {/* 3. Footer 居底贯穿整行 */}
          <Footer />
        </div>
      </body>
    </html>
  );
}
