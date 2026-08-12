"use client";
import dynamic from "next/dynamic";

const TripNavigationClient = dynamic(() => import("./TripNavigationClient"), {
  ssr: false,
});

export default function TravelLogisticsPage() {
  return <TripNavigationClient />;
}
