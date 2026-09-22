type StopCoordinates = {
  lat: number;
  lng: number;
};

export function getGoogleMapsUrl(
  origin: StopCoordinates,
  destination: StopCoordinates
): string {
  const originCoordinates = encodeURIComponent(`${origin.lat},${origin.lng}`);
  const destinationCoordinates = encodeURIComponent(`${destination.lat},${destination.lng}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${originCoordinates}&destination=${destinationCoordinates}&travelmode=driving`;
}

export function getWazeUrl(
  destination: StopCoordinates,
  origin?: StopCoordinates
): string {
  const originParameter = origin ? `&from=${origin.lat},${origin.lng}` : '';
  return `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes${originParameter}&f=${origin ? `${origin.lat},${origin.lng}` : `${destination.lat},${destination.lng}`}`;
}