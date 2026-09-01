/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'leaflet' {
  export type LatLngExpression = [number, number] | { lat: number; lng: number };

  export interface LatLng {
    lat: number;
    lng: number;
  }

  export interface LeafletMouseEvent {
    latlng: LatLng;
  }

  export function icon(options: any): any;

  const L: any;
  export default L;
}
