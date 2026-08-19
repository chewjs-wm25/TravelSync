/**
 * Module 04 vehicle persistence helpers kept inside the app module folder
 * to avoid cross-module API-layer coupling.
 */

import { NextResponse, type NextRequest } from 'next/server';

type VehiclePayload = {
  id?: string;
  user_id?: unknown;
  name?: unknown;
  fuel_consumption?: unknown;
  fuel_type?: unknown;
  is_default?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VehiclePayload;
    const userId = typeof body.user_id === 'string' ? body.user_id : '';
    const vehicleName = typeof body.name === 'string' ? body.name : '';
    const routeId = typeof body.id === 'string' ? body.id : undefined;

    if (!userId || !vehicleName || body.fuel_consumption === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, name, fuel_consumption' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id: routeId });
  } catch (error) {
    console.error('Error adding vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to add vehicle' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id query parameter' },
        { status: 400 }
      );
    }

    return NextResponse.json({ vehicles: [] });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}
