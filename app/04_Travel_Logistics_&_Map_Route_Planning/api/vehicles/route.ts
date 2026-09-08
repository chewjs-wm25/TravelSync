import {
  getVehiclesDB,
  saveVehicleDB,
} from "@/data_access_layer/04_Travel_Logistics_&_Map_Route_Planning/database";
import { requireUser } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";
import type { Vehicle } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

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
    const vehicles = await getVehiclesDB(auth.session.userId);
    return Response.json({ success: true, vehicles });
  } catch (error) {
    return failure(error, "Failed to load vehicles");
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Partial<Vehicle>;
    if (!body.name || typeof body.fuelConsumption !== "number" || body.fuelConsumption <= 0) {
      return failure(null, "Vehicle name and positive fuel consumption are required", 400);
    }

    const vehicle = await saveVehicleDB(
      {
        id: body.id || crypto.randomUUID(),
        name: body.name,
        category: body.category || "car",
        fuelConsumption: body.fuelConsumption,
        fuelType: body.fuelType || "Petrol",
        isDefault: body.isDefault === true,
      },
      auth.session.userId
    );
    return Response.json({ success: true, vehicle }, { status: 201 });
  } catch (error) {
    return failure(error, "Failed to save vehicle");
  }
}
