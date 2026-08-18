/**
 * Module 04 route persistence helpers kept inside the app module folder
 * to avoid cross-module API-layer coupling.
 */

import { NextResponse, type NextRequest } from 'next/server';

type SavedRoutePayload = {
  id?: string;
  user_id?: unknown;
  name?: unknown;
  origin_name?: unknown;
  origin_lat?: unknown;
  origin_lng?: unknown;
  destination_name?: unknown;
  destination_lat?: unknown;
  destination_lng?: unknown;
  distance_km?: unknown;
  time_minutes?: unknown;
  fuel_liters?: unknown;
  fuel_cost?: unknown;
  vehicle_type?: unknown;
  optimization_mode?: unknown;
  vehicle_id?: unknown;
  route_points?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SavedRoutePayload;
    const userId = typeof body.user_id === 'string' ? body.user_id : '';
    const routeName = typeof body.name === 'string' ? body.name : '';
    const routeId = typeof body.id === 'string' ? body.id : undefined;

    if (!userId || !routeName) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, name' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id: routeId });
  } catch (error) {
    console.error('Error saving route:', error);
    return NextResponse.json(
      { error: 'Failed to save route' },
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

    return NextResponse.json({ routes: [] });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}
