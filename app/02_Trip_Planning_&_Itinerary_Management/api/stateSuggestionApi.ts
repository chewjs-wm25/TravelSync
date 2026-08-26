/**
 * Client-side contract for state suggestions supplied by module 03.
 *
 * This stub keeps the create-trip form usable until module 03 exposes its
 * state lookup interface. Replace only `stateSuggestionProvider` when that
 * integration is available.
 */
export interface StateSuggestion {
  stateId: string;
  name: string;
  lat: number;
  lon: number;
  imageUrl: string;
}

export interface StateSuggestionProvider {
  getStateSuggestions(query: string): Promise<StateSuggestion[]>;
}

const stubStates: StateSuggestion[] = [
  { stateId: "kuala-lumpur", name: "Kuala Lumpur", lat: 3.139, lon: 101.6869, imageUrl: "" },
  { stateId: "selangor", name: "Selangor", lat: 3.0738, lon: 101.5183, imageUrl: "" },
  { stateId: "penang", name: "Penang", lat: 5.4164, lon: 100.3327, imageUrl: "" },
  { stateId: "johor", name: "Johor", lat: 1.4927, lon: 103.7414, imageUrl: "" },
  { stateId: "kedah", name: "Kedah", lat: 6.1184, lon: 100.3685, imageUrl: "" },
  { stateId: "perak", name: "Perak", lat: 4.5975, lon: 101.0901, imageUrl: "" },
  { stateId: "negeri-sembilan", name: "Negeri Sembilan", lat: 2.7258, lon: 101.9424, imageUrl: "" },
  { stateId: "melaka", name: "Melaka", lat: 2.1896, lon: 102.2501, imageUrl: "" },
  { stateId: "terengganu", name: "Terengganu", lat: 5.3117, lon: 103.1324, imageUrl: "" },
  { stateId: "pahang", name: "Pahang", lat: 3.8126, lon: 103.3256, imageUrl: "" },
  { stateId: "kelantan", name: "Kelantan", lat: 6.1254, lon: 102.2381, imageUrl: "" },
  { stateId: "perlis", name: "Perlis", lat: 6.4449, lon: 100.2048, imageUrl: "" },
  { stateId: "sabah", name: "Sabah", lat: 5.4204, lon: 116.7968, imageUrl: "" },
  { stateId: "sarawak", name: "Sarawak", lat: 1.5533, lon: 110.3592, imageUrl: "" },
  { stateId: "labuan", name: "Labuan", lat: 5.2831, lon: 115.2308, imageUrl: "" },
  { stateId: "putrajaya", name: "Putrajaya", lat: 2.9264, lon: 101.6964, imageUrl: "" },
];

export const stateSuggestionProvider: StateSuggestionProvider = {
  async getStateSuggestions(query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const matches = stubStates.filter((state) =>
      state.name.toLowerCase().includes(normalizedQuery)
    );
    if (matches.length > 0) {
      return matches.slice(0, 5);
    }

    const firstLetterMatches = stubStates.filter(
      (state) => state.name[0]?.toLowerCase() === normalizedQuery[0]
    );

    return firstLetterMatches.length > 0
      ? firstLetterMatches.slice(0, 5)
      : stubStates.slice(0, 5);
  },
};

export function getStateSuggestions(query: string): Promise<StateSuggestion[]> {
  return stateSuggestionProvider.getStateSuggestions(query);
}
