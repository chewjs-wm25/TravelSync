-- English

# Module 02 — Trip Planning & Itinerary Management Interface

## 1. Module Responsibility

Trip Planning & Itinerary Management manages trips, itineraries, and itinerary items. It allows users to create and organize trips by selecting destinations and places, arranging places into itineraries, and scheduling itinerary items.

The module also exchanges trip, place, and travel-time information with other modules to support travel-time calculation and collaborative trip planning.

## 2. Dependencies

### 2.1 Dependencies on Other Modules

- **Module 01 — User & Account Management**
  - Provides the user ID required to associate a trip with a user.

- **Module 03 — Destination Discovery & Inspiration**
  - Provides state information when creating a trip.
  - Provides place information when adding places to an itinerary.

- **Module 04 — Travel Logistics & Map Route Planning**
  - Provides calculated travel time between places for each itinerary.
  - Receives trip and itinerary place information from Module 02 for travel-time calculation.

- **Module 05 — Collaboration & Shared Planning**
  - Receives trip information from Module 02 to support sharing and collaboration between users.

### 2.2 Environment / Storage Dependencies

- **Cloudflare D1 (`TEST_DB`)**
  - Stores trip, itinerary, and itinerary-item information.

## 3. Exposed Interfaces

### 3.1 Providing

#### Module 04 — Travel Logistics & Map Route Planning

Module 02 provides trip information to Module 04 so that travel time can be calculated between all places within each itinerary of a trip.

**Information provided:**

- Trip ID
- Trip name
- Itinerary ID
- Itinerary date
- Place ID
- Place name
- Place location

**Purpose:** Module 04 uses the itinerary places and their locations to calculate travel time between places.

#### Module 05 — Collaboration & Shared Planning

Module 02 provides trip information to Module 05 to allow trips to be shared and collaboratively planned between different users.

**Information provided:**

- Trip ID
- User ID
- Trip name
- Trip dates
- Itinerary information
- Itinerary item information

**Purpose:** Module 05 uses the trip information to support trip sharing and collaboration.

### 3.2 Requesting

#### Module 01 — User & Account Management

Module 02 requests the user ID required to associate a trip with the correct user.

**Information requested:**

- User ID

#### Module 03 — Destination Discovery & Inspiration

**State Information**

Module 02 requests state information when creating a trip.

**Information requested:**

- State ID
- State name
- State location
- State image

**Place Information**

Module 02 requests place information when adding a place to an itinerary.

**Information requested:**

- Place ID
- Place name
- Place location
- Place image

#### Module 04 — Travel Logistics & Map Route Planning

Module 02 requests the calculated travel time between places within each itinerary.

**Information requested:**

- Origin place
- Destination place
- Calculated travel time

**Purpose:** The returned travel time is displayed between the corresponding places in the itinerary.

## 4. Core TypeScript Types

```ts
/** Trip information provided to Module 04 for travel-time calculation */
export interface TripRouteData {
  tripId: string;
  tripName: string;
  itineraries: ItineraryRouteData[];
}

export interface ItineraryRouteData {
  itineraryId: string;
  date: string;
  places: RoutePlace[];
}

export interface RoutePlace {
  placeId: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

/** Trip information provided to Module 05 for collaboration */
export interface CollaborationTripData {
  tripId: string;
  userId: string;
  tripName: string;
  startDate?: string | null;
  endDate?: string | null;
  itineraries: CollaborationItinerary[];
}

export interface CollaborationItinerary {
  itineraryId: string;
  date: string;
  title: string;
  items: CollaborationItem[];
}

export interface CollaborationItem {
  itemId: string;
  placeId?: string | null;
  name: string;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
}

/** User information requested from Module 01 */
export interface UserInfo {
  userId: string;
}

/** State information requested from Module 03 */
export interface StateInfo {
  stateId: string;
  stateName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  image: string;
}

/** Place information requested from Module 03 */
export interface PlaceInfo {
  placeId: string;
  placeName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  image: string;
}

/** Travel-time information requested from Module 04 */
export interface TravelTimeResult {
  tripId: string;
  itineraryId: string;
  travelTimes: TravelTime[];
}

export interface TravelTime {
  fromPlaceId: string;
  toPlaceId: string;
  travelTimeMinutes: number;
}
```
