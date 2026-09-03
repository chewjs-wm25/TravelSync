"use client";
import { useSidebarStore } from "@/store/useSidebarStore";
import {
  Map,
  Lightbulb,
  MapPin,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const MENU_ITEMS = [
  {
    name: "Trip Planning",
    icon: Map,
    href: "/02_Trip_Planning_&_Itinerary_Management",
  },
  {
    name: "Discovery & Idea",
    icon: Lightbulb,
    href: "/03_Destination_Discovery_&_Inspiration",
  },
  {
    name: "Logistics & Maps",
    icon: MapPin,
    href: "/04_Travel_Logistics_&_Map_Route_Planning",
  },
  {
    name: "Shared Planning",
    icon: Users,
    href: "/05_Collaboration_&_Shared_Planning",
  },
  {
    name: "Account",
    icon: Settings,
    href: "/01_User_&_Account_Management",
  },
];

export default function Sidebar() {
  const { isOpen, toggleSidebar } = useSidebarStore();
  const { isLoggedIn } = useAuthStore();
  const pathname = usePathname();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  // When not mounted yet or user is not logged in, do not render sidebar
  if (!mounted || !isLoggedIn) {
    return null;
  }

  return (
    <aside
      className={`${
        isOpen ? "w-72" : "w-24"
      } ease-bento relative z-10 hidden h-full flex-col border-r-2 border-gray-200 bg-white transition-all duration-300 md:flex`}
    >
      {/* 伸缩控制按钮 */}
      <button
        onClick={toggleSidebar}
        className="hover:text-primary-500 hover:shadow-hover absolute top-6 -right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-500 shadow-md transition-all duration-150 active:scale-95"
      >
        {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {/* 菜单列表容器 */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-6">
        {MENU_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => {
                if (isActive) {
                  e.preventDefault();
                  return;
                }
                const target = item.href;
                const current = window.location.pathname;
                setTimeout(() => {
                  if (window.location.pathname === current && !window.location.pathname.startsWith(target)) {
                    window.location.href = target;
                  }
                }, 150);
              }}
              className={`group flex items-center gap-4 rounded-2xl transition-all duration-200 ease-out active:scale-[0.98] ${
                isOpen ? "px-5 py-4" : "justify-center p-4"
              } ${
                isActive
                  ? "bg-primary-500 shadow-hover hover:bg-primary-500/85 text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200"
              }`}
              title={!isOpen ? item.name : ""}
            >
              <Icon
                size={28}
                strokeWidth={2}
                className={`${
                  isActive
                    ? "text-white"
                    : "text-gray-500 group-hover:text-gray-800"
                } transition-colors`}
              />
              {isOpen && (
                <span
                  className={`text-lg whitespace-nowrap ${
                    isActive ? "font-semibold text-white" : "font-medium"
                  }`}
                >
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
