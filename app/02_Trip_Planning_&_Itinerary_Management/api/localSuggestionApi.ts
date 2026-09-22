import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";

export interface LocalSuggestion {
  id: string;
  name: string;
  value: string;
  formatted: string;
  imageUrl?: string;
  lat?: number;
  lon?: number;
}

export interface LocalSuggestionProvider {
  getLocalSuggestions(query: string): Promise<LocalSuggestion[]>;
}

export const localSuggestionProvider: LocalSuggestionProvider = {
  async getLocalSuggestions(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const suggestions = await discoveryService.getSuggestions(trimmed);
      return suggestions.slice(0, 6).map(({ placeId, name, formatted, lat, lon }) => ({
        id: placeId,
        name,
        value: formatted,
        formatted,
        imageUrl: "",
        lat,
        lon,
      }));
    } catch {
      return [];
    }
  },
};

export function getLocalSuggestions(query: string): Promise<LocalSuggestion[]> {
  return localSuggestionProvider.getLocalSuggestions(query);
}
