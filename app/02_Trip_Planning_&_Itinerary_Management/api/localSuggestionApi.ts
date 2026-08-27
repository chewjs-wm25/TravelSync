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

const MALAYSIA_PLACE_SUGGESTIONS: LocalSuggestion[] = [
  {
    id: "local:kuala-lumpur",
    name: "Kuala Lumpur",
    value: "Kuala Lumpur, Malaysia",
    formatted: "Kuala Lumpur, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
    lat: 3.139,
    lon: 101.6869,
  },
  {
    id: "local:petronas-twin-towers",
    name: "Petronas Twin Towers",
    value: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
    formatted: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80",
    lat: 3.1579,
    lon: 101.7113,
  },
  {
    id: "local:batu-caves",
    name: "Batu Caves",
    value: "Batu Caves, Selangor, Malaysia",
    formatted: "Batu Caves, Selangor, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    lat: 3.2378,
    lon: 101.6831,
  },
  {
    id: "local:penang",
    name: "Penang",
    value: "Penang, Malaysia",
    formatted: "Penang, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    lat: 5.4141,
    lon: 100.3292,
  },
  {
    id: "local:georgetown",
    name: "George Town",
    value: "George Town, Penang, Malaysia",
    formatted: "George Town, Penang, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80",
    lat: 5.4141,
    lon: 100.3292,
  },
  {
    id: "local:langkawi",
    name: "Langkawi",
    value: "Langkawi, Kedah, Malaysia",
    formatted: "Langkawi, Kedah, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80",
    lat: 6.35,
    lon: 99.8,
  },
  {
    id: "local:melaka",
    name: "Melaka",
    value: "Melaka, Malaysia",
    formatted: "Melaka, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    lat: 2.1896,
    lon: 102.2501,
  },
  {
    id: "local:malacca",
    name: "Malacca",
    value: "Malacca, Malaysia",
    formatted: "Malacca, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    lat: 2.1896,
    lon: 102.2501,
  },
  {
    id: "local:cameron-highlands",
    name: "Cameron Highlands",
    value: "Cameron Highlands, Pahang, Malaysia",
    formatted: "Cameron Highlands, Pahang, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
    lat: 4.478,
    lon: 101.375,
  },
  {
    id: "local:kota-kinabalu",
    name: "Kota Kinabalu",
    value: "Kota Kinabalu, Sabah, Malaysia",
    formatted: "Kota Kinabalu, Sabah, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    lat: 5.9804,
    lon: 116.0735,
  },
  {
    id: "local:kuching",
    name: "Kuching",
    value: "Kuching, Sarawak, Malaysia",
    formatted: "Kuching, Sarawak, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    lat: 1.5536,
    lon: 110.3593,
  },
  {
    id: "local:johor-bahru",
    name: "Johor Bahru",
    value: "Johor Bahru, Johor, Malaysia",
    formatted: "Johor Bahru, Johor, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    lat: 1.4927,
    lon: 103.7414,
  },
  {
    id: "local:perhentian-island",
    name: "Perhentian Island",
    value: "Perhentian Island, Terengganu, Malaysia",
    formatted: "Perhentian Island, Terengganu, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    lat: 5.905,
    lon: 102.739,
  },
  {
    id: "local:gunung-mulu",
    name: "Gunung Mulu",
    value: "Gunung Mulu, Sarawak, Malaysia",
    formatted: "Gunung Mulu, Sarawak, Malaysia",
    imageUrl:
      "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80",
    lat: 4.047,
    lon: 114.826,
  },
];

export const localSuggestionProvider: LocalSuggestionProvider = {
  async getLocalSuggestions(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const normalized = trimmed.toLowerCase();
    return MALAYSIA_PLACE_SUGGESTIONS.filter(({ name, formatted, value }) => {
      const haystacks = [name, formatted, value];
      return haystacks.some((candidate) =>
        candidate.toLowerCase().includes(normalized)
      );
    }).slice(0, 6);
  },
};

export function getLocalSuggestions(query: string): Promise<LocalSuggestion[]> {
  return localSuggestionProvider.getLocalSuggestions(query);
}
