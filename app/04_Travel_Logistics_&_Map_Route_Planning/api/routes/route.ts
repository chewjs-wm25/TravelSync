import {
  getSavedRoutesDB,
  saveRouteDB,
} from "@/data_access_layer/04_Travel_Logistics_&_Map_Route_Planning/database";
import { requireUser } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";
import type { SavedRoute } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

function failure(error: unknown, fallback: string, status = 500) {
  return Response.json(
    { success: false, error: error instanceof Error ? error.message : fallback },
    { status }
  );
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const routes = await getSavedRoutesDB(auth.session.userId);
    return Response.json({ success: true, routes });
  } catch (error) {
    return failure(error, "Failed to load saved routes");
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<SavedRoute>;
    if (!body.name || !body.origin || !body.destination || !body.summary) {
      return failure(null, "Route name, origin, destination, and summary are required", 400);
    }

    const route = await saveRouteDB(
      {
        ...body,
        id: body.id || crypto.randomUUID(),
        userId: auth.session.userId,
        name: body.name,
        origin: body.origin,
        destination: body.destination,
        summary: body.summary,
        vehicleType: body.vehicleType || "car",
        optimizationMode: body.optimizationMode || "fastest",
        routePoints: body.routePoints || [],
      } as SavedRoute,
      auth.session.userId
    );
    return Response.json({ success: true, route }, { status: 201 });
  } catch (error) {
    return failure(error, "Failed to save route");
  }
}
