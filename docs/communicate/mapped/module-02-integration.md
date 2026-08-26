Module 02 — Integration mapping and alignment

Summary

This document maps the external interfaces and integration points for Module 02 (Trip Planning & Itinerary Management) to concrete implementations in the codebase and verifies alignment with docs/communicate guideline.md (system conventions).

Key decisions

- Geo coordinates comply with guideline.md: fields are flat lat / lon (see [tripService.ts](/home/william/Documents/TravelSync/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/tripService.ts)).
- Identifiers: tripId, itemId, placeId are used in the external-facing types and API payloads.
- Route API path convention: Next.js route endpoints in the app tree use the module-prefixed route paths (e.g. POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import implemented at [app/02_Trip_Planning_&_Itinerary_Management/api/itineraries/[itineraryId]/items/import/route.ts](/home/william/Documents/TravelSync/app/02_Trip_Planning_&_Itinerary_Management/api/itineraries/%5BitineraryId%5D/items/import/route.ts)).
- Success flag convention: all business logic functions and route JSON responses follow { success: boolean, ... } shape.

Where to find Module 02 capabilities (implementation links)

- BL exports & types:
  - Trip-level services and types: [tripService.ts](/home/william/Documents/TravelSync/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/tripService.ts)
    - getTripRouteData(db, tripId): TripRouteData — assembles route places for Module 04
    - getCollaborationTripData(db, tripId): CollaborationTripData — assembles collaboration payload for Module 05
  - Itinerary-level services: [itineraryService.ts](/home/william/Documents/TravelSync/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/itineraryService.ts)
    - createItinerary / updateItinerary / deleteItinerary
    - triggers Module 02 itinerary change events via [events.ts](/home/william/Documents/TravelSync/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/events.ts)
  - Itinerary item services: [itineraryItemService.ts](/home/william/Documents/TravelSync/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemService.ts)
    - createItineraryItem / updateItineraryItemById / deleteItineraryItemById
    - importPlaces(db, itineraryId, items: ImportPlaceInput[]) — used by Module 03

- Data access layer (D1 repositories):
  - [itineraryRepository.ts](/home/william/Documents/TravelSync/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository.ts)
  - [itineraryItemRepository.ts](/home/william/Documents/TravelSync/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemRepository.ts)
  - [tripRepository.ts](/home/william/Documents/TravelSync/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository.ts)

- Route API endpoints (Next.js app routes called by front-end and other modules):
  - POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import
    - handler: [app/02_Trip_Planning_&_Itinerary_Management/api/itineraries/[itineraryId]/items/import/route.ts](/home/william/Documents/TravelSync/app/02_Trip_Planning_&_Itinerary_Management/api/itineraries/%5BitineraryId%5D/items/import/route.ts)
    - client entry: [app/02_Trip_Planning_&_Itinerary_Management/api/itineraryItemApi.ts](/home/william/Documents/TravelSync/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryItemApi.ts) – importPlacesAction

- Event pub/sub for cross-module notification:
  - addItineraryChangedListener / removeItineraryChangedListener / triggerItineraryChanged implemented at [events.ts](/home/william/Documents/TravelSync/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/events.ts). Other modules may register listeners by importing these functions to respond to itinerary changes.

Integration checklist (status)

- [x] Coordinates format: lat / lon flat fields throughout BL and API.
- [x] Identifier naming: tripId, itemId, placeId used in BL and API.
- [x] getTripRouteData present and returns RoutePlace[] compatible with Module 04 Stop shape.
- [x] getCollaborationTripData present and returns CollaborationTripData for Module 05.
- [x] importPlaces implemented and exposed via route for Module 03.
- [x] onItineraryChanged trigger implemented as events.triggerItineraryChanged and invoked after create/update/delete/import operations.
- [ ] API route surface: most front-end client calls exist; additional public Route API endpoints can be added under app/02_.../api/ as needed.

Notes for Module owners

- Module 04 (Travel Logistics) can call getTripRouteData via the BL interface or use the Route API pattern: a small wrapper endpoint can be added if cross-origin/route-level access is required.
- Module 05 (Collaboration) should call getCollaborationTripData to obtain the authoritative trip state; CRU(D) of items for collaboration should delegate to Module 02 ItemRepo functions (data access layer) or to BL action endpoints.
- Module 03 (Discovery) uses the import endpoint to add selected places to a target itinerary; ensure routePlannerBridge.setTargetItinerary is called before pushItem.

Next steps

- Add any missing public Route API endpoints in app/02_Trip_Planning_&_Itinerary_Management/api/ to match the full list in docs/communicate/02_interface.md if direct HTTP access is required by other modules (e.g. collaboration bootstrap endpoint used by Module 05).
- Add a short example in docs/communicate showing how Module 04 and Module 05 should call Module 02 functions (code snippets + sample responses).

Prepared by: Copilot CLI runtime integration assistant
