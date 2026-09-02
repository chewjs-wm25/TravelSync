import { Suspense } from "react";
import CollaborationPageClient from "./CollaborationPageClient";
import { loadBootstrap } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/CollabBootstrap";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; invite?: string }>;
}) {
  const { trip, invite } = await searchParams;
  let initialTrip: Awaited<ReturnType<typeof loadBootstrap>>["trip"] | null = null;
  let initialMeId: string | null = null;

  if (trip) {
    try {
      // 服务端直接尝试加载行程，失败则交由客户端通过 x-demo-user-id 重试
      // 使用默认 demo 用户 dev-user-001 作为兜底，客户端会用真实登录用户重载
      const data = await loadBootstrap(trip, "dev-user-001");
      initialTrip = data.trip;
      initialMeId = data.meUserId;
    } catch {
      // 保持 null，客户端会在 hasMounted 后按真实 isLoggedIn 重试
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
          Loading collaboration...
        </div>
      }
    >
      <CollaborationPageClient
        initialTripId={trip ?? null}
        initialInvite={invite ?? null}
        initialTrip={initialTrip}
        initialMeId={initialMeId}
      />
    </Suspense>
  );
}
