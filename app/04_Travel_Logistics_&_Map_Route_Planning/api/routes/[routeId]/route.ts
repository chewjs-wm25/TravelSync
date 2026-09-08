import {
  deleteRouteDB,
  getSavedRouteDB,
  updateRouteDB,
} from "@/data_access_layer/04_Travel_Logistics_&_Map_Route_Planning/database";
import { requireUser } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";
import type { SavedRoute } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

type Context = { params: Promise<{ routeId: string }> };

function failure(error: unknown, fallback: string, status = 500) {
  return Response.json(
    { success: false, error: error instanceof Error ? error.message : fallback },
    { status }
  );
}

export async function GET(request: Request, { params }: Context) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { routeId } = await params;
    const route = await getSavedRouteDB(auth.session.userId, routeId);
    if (!route) return failure(null, "Saved route not found", 404);
    return Response.json({ success: true, route });
  } catch (error) {
    return failure(error, "Failed to load saved route");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { routeId } = await params;
    const body = (await request.json()) as Partial<SavedRoute>;
    const existing = await getSavedRouteDB(auth.session.userId, routeId);
    if (!existing) return failure(null, "Saved route not found", 404);
    const route = await updateRouteDB(
      {
        ...existing,
        ...body,
        id: routeId,
        userId: auth.session.userId,
      } as SavedRoute,
      auth.session.userId
    );
    if (!route) return failure(null, "Saved route not found", 404);
    return Response.json({ success: true, route });
  } catch (error) {
    return failure(error, "Failed to update saved route");
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { routeId } = await params;
    const deleted = await deleteRouteDB(auth.session.userId, routeId);
    if (!deleted) return failure(null, "Saved route not found", 404);
    return Response.json({ success: true });
  } catch (error) {
    return failure(error, "Failed to delete saved route");
  }
}
