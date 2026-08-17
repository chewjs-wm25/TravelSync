## Module 02: Trip Planning & Itinerary Management

### Phase 0: Setup & UI Refactoring
- [x] Refactor monolithic `page.tsx` into `components/` (`SearchBar.tsx`, `TripCard.tsx`, `CreateTripCard.tsx`, `SuggestedTripCard.tsx`)
- [x] Add Module 02 table definitions (`trips`, `itineraries`, `itinerary_items`) to `schema.sql` (Note: Travel notes are embedded via `trip_note` and `itinerary_note`)

### Phase 1: Trip Management
- [x] **FR001**: Create Trip (BLL, DAL, API, UI Modal)
- [x] **FR002**: Delete Trip (BLL, DAL, API, UI Action)
- [x] **FR003**: Edit Trip (BLL, DAL, API, UI Modal)

### Phase 2: Itinerary Management
- [x] **FR004**: Create Itinerary
- [x] **FR005**: Delete Itinerary
- [x] **FR006**: Edit Itinerary

### Refactor / UI Decomposition Status
- [x] Refactored the trip itinerary workspace into modular components: `ItineraryHeader.tsx`, `ItineraryTimeline.tsx`, `ItineraryDayCard.tsx`, and the existing `CreateItineraryModal.tsx`.
- [x] Reconnected the dynamic trip + itinerary data fetching and creation validation back into the page shell.
- [x] Preserved `Itinerary added!` and `Invalid date!` toast flow required by FR004.

### Phase 3: Itinerary Items & Notes
- [ ] **FR007–FR009**: Add, Edit, Delete Itinerary Items
- [ ] **FR010–FR012**: Add, Edit, Delete Travel Notes
- [ ] **FR013**: Detect Schedule Conflicts
