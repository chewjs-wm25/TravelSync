import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";

export interface StateSuggestion {
 stateId: string;
 name: string;
 lat: number;
 lon: number;
 imageUrl: string;
}

const FALLBACK_STATE_SUGGESTIONS: StateSuggestion[] = [
 { stateId: "johor", name: "Johor", lat: 1.485, lon: 103.761, imageUrl: "" },
 { stateId: "kedah", name: "Kedah", lat: 6.125, lon: 100.367, imageUrl: "" },
 { stateId: "kelantan", name: "Kelantan", lat: 6.125, lon: 102.238, imageUrl: "" },
 { stateId: "kuala-lumpur", name: "Kuala Lumpur", lat: 3.139, lon: 101.6869, imageUrl: "" },
 { stateId: "labuan", name: "Labuan", lat: 5.283, lon: 115.241, imageUrl: "" },
 { stateId: "melaka", name: "Melaka", lat: 2.1896, lon: 102.2501, imageUrl: "" },
 { stateId: "negeri-sembilan", name: "Negeri Sembilan", lat: 2.725, lon: 101.942, imageUrl: "" },
 { stateId: "pahang", name: "Pahang", lat: 3.807, lon: 103.326, imageUrl: "" },
 { stateId: "penang", name: "Penang", lat: 5.4141, lon: 100.3292, imageUrl: "" },
 { stateId: "perak", name: "Perak", lat: 4.597, lon: 101.090, imageUrl: "" },
 { stateId: "perlis", name: "Perlis", lat: 6.441, lon: 100.198, imageUrl: "" },
 { stateId: "putrajaya", name: "Putrajaya", lat: 2.926, lon: 101.696, imageUrl: "" },
 { stateId: "sabah", name: "Sabah", lat: 5.976, lon: 116.07, imageUrl: "" },
 { stateId: "sarawak", name: "Sarawak", lat: 1.55, lon: 110.359, imageUrl: "" },
 { stateId: "selangor", name: "Selangor", lat: 3.073, lon: 101.518, imageUrl: "" },
 { stateId: "terengganu", name: "Terengganu", lat: 5.332, lon: 103.14, imageUrl: "" },
];

export interface StateSuggestionProvider {
 getStateSuggestions(query: string): Promise<StateSuggestion[]>;
}

export const stateSuggestionProvider: StateSuggestionProvider = {
 async getStateSuggestions(query: string) {
   const normalizedQuery = query.trim().toLowerCase();
   if (!normalizedQuery) {
     return [];
   }

   let stateInfo: StateSuggestion[];
   try {
     const remoteStateInfo = await discoveryService.getStateInfo();
     stateInfo = remoteStateInfo.map((state) => ({
       stateId: state.stateId,
       name: state.name,
       lat: state.lat,
       lon: state.lon,
       imageUrl: state.imageUrl,
     }));
   } catch {
     stateInfo = FALLBACK_STATE_SUGGESTIONS;
   }

   const matches = stateInfo.filter((state) =>
     state.name.toLowerCase().includes(normalizedQuery)
   );

   if (matches.length > 0) {
     return matches.slice(0, 5);
   }

   const firstLetterMatches = stateInfo.filter(
     (state) => state.name[0]?.toLowerCase() === normalizedQuery[0]
   );

   return (firstLetterMatches.length > 0 ? firstLetterMatches : stateInfo)
     .slice(0, 5);
 },
};

export function getStateSuggestions(query: string): Promise<StateSuggestion[]> {
 return stateSuggestionProvider.getStateSuggestions(query);
}
