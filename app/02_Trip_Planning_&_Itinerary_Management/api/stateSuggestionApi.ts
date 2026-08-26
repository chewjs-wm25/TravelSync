import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";

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

export const stateSuggestionProvider: StateSuggestionProvider = {
 async getStateSuggestions(query: string) {
   const normalizedQuery = query.trim().toLowerCase();
   if (!normalizedQuery) {
     return [];
   }

   const stateInfo = await discoveryService.getStateInfo();
   const matches = stateInfo.filter((state) =>
     state.name.toLowerCase().includes(normalizedQuery)
   );

   if (matches.length > 0) {
     return matches.slice(0, 5).map((state) => ({
       stateId: state.stateId,
       name: state.name,
       lat: state.lat,
       lon: state.lon,
       imageUrl: state.imageUrl,
     }));
   }

   const firstLetterMatches = stateInfo.filter(
     (state) => state.name[0]?.toLowerCase() === normalizedQuery[0]
   );

   return (firstLetterMatches.length > 0 ? firstLetterMatches : stateInfo)
     .slice(0, 5)
     .map((state) => ({
       stateId: state.stateId,
       name: state.name,
       lat: state.lat,
       lon: state.lon,
       imageUrl: state.imageUrl,
     }));
 },
};

export function getStateSuggestions(query: string): Promise<StateSuggestion[]> {
 return stateSuggestionProvider.getStateSuggestions(query);
}
