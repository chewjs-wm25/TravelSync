export interface PlaceSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export async function fetchSuggestions(
  query: string
): Promise<PlaceSuggestion[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error('Place search failed');
  }

  return (await response.json()) as PlaceSuggestion[];
}