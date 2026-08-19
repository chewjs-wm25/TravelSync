type StopCoordinates = {
  lat: number;
  lng: number;
};

export function getGoogleMapsUrl(
  origin: StopCoordinates,
  destination: StopCoordinates
): string {
  return `https://www.google.com/maps/dir/${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
}

export function getWazeUrl(destination: StopCoordinates): string {
  return `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
}