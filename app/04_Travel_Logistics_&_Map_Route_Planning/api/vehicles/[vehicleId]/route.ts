import {
  deleteVehicleDB,
  getVehiclesDB,
  setDefaultVehicleDB,
  updateVehicleDB,
} from "@/data_access_layer/04_Travel_Logistics_&_Map_Route_Planning/database";
import { requireUser } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";
import type { Vehicle } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

type Context = { params: Promise<{ vehicleId: string }> };

function failure(error: unknown, fallback: string, status = 500) {
  return Response.json(
    { success: false, error: error instanceof Error ? error.message : fallback },
    { status }
  );
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { vehicleId } = await params;
    const body = (await request.json()) as Partial<Vehicle> & { setDefault?: boolean };
    const vehicle = body.setDefault
      ? await setDefaultVehicleDB(vehicleId, auth.session.userId)
      : await (async () => {
          const existing = (await getVehiclesDB(auth.session.userId)).find((item) => item.id === vehicleId);
          if (!existing) return null;
          return updateVehicleDB(
            {
              ...existing,
              ...body,
              id: vehicleId,
            },
            auth.session.userId
          );
        })();
    if (!vehicle) return failure(null, "Vehicle not found", 404);
    return Response.json({ success: true, vehicle });
  } catch (error) {
    return failure(error, "Failed to update vehicle");
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { vehicleId } = await params;
    const deleted = await deleteVehicleDB(vehicleId, auth.session.userId);
    if (!deleted) return failure(null, "Vehicle not found", 404);
    return Response.json({ success: true });
  } catch (error) {
    return failure(error, "Failed to delete vehicle");
  }
}
