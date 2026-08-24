# Module 02 — Trip Planning & Itinerary Management Interface

## 1. Module Basic Information

### Module Name

`02_Trip_Planning_&_Itinerary_Management`

### Responsibility

Module 02 manages trips, daily itineraries, and itinerary items. It provides functions for creating, retrieving, updating, and deleting trips and itinerary data, including itinerary notes, places, item types, references, scheduled times, and item positions.

The implementation uses server actions in Next.js to call the module's business-logic services and persists data through the module's D1 data-access repositories.

### Service Entry

The implementation exposes two forms of service entry:

1. **Next.js server actions** — the primary internal module interface used by the UI:
   - `createTripAction(input)`
   - `updateTripAction(input)`
   - `listTripsAction(userId?)`
   - `deleteTripAction(input)`
   - `createItineraryAction(input)`
   - `listItinerariesAction(tripId?)`
   - `updateItineraryAction(input)`
   - `deleteItineraryAction(input)`
   - `createItineraryItemAction(input)`
   - `listItineraryItemsAction(itineraryId?)`
   - `updateItineraryItemAction(input)`
   - `deleteItineraryItemAction(input)`

2. **Next.js route handlers** present in the module for itinerary-item operations:
   - `GET /api/itineraries/{itineraryId}/items`
   - `POST /api/itineraries/{itineraryId}/items`
   - `PATCH /api/itineraries/{itineraryId}/items/{itemId}`
   - `PUT /api/itineraries/{itineraryId}/items/{itemId}`
   - `DELETE /api/itineraries/{itineraryId}/items/{itemId}`

The source code does **not** define public REST route handlers for trip or itinerary CRUD; those operations are exposed through server actions.

---

## 2. Interface and Data Format Specification

## Providing

### 1. Trip Information to Module 04 — Travel Logistics & Map Route Planning

Module 02 provides trip and itinerary information to Module 04 to allow travel time to be calculated between places within each itinerary.

Information provided:
- Trip ID
- Itinerary ID
- Itinerary date
- Itinerary items
- Place ID / Reference ID
- Place name
- Place location
- Item order, if applicable

### 2. Trip Information to Module 05 — Collaboration & Shared Planning

Module 02 provides trip information to Module 05 to support sharing and collaborative planning between users.

Information provided:
- Trip ID
- Trip name
- Trip owner/user ID
- Trip date range
- Itinerary information
- Itinerary items


### Requesting

#### 1. User ID from Module 01 — User & Account Management

Module 02 requests the user ID from Module 01 to identify the user associated with a trip.

#### 2. State Information from Module 03 — Destination Discovery & Inspiration

Module 02 requests state information when creating a trip.

Information requested:
- State ID
- State name
- State location
- State image

#### 3. Place Information from Module 03 — Destination Discovery & Inspiration

Module 02 requests place information when adding a place to an itinerary.

Information requested:
- Place ID
- Place name
- Place location
- Place image

#### 4. Calculated Travel Time from Module 04 — Travel Logistics & Map Route Planning

Module 02 requests calculated travel time between places within each itinerary.

Information requested:
- Origin place
- Destination place
- Travel time
- Travel mode, if applicable

The returned travel time is displayed between the corresponding itinerary places.

---

## 3. Upstream / Downstream Dependencies and Interaction Flow

### 3.1 Upstream Dependencies

The source code shows the following dependencies:

| Dependency | Direction | Purpose | Current Implementation |
|---|---|---|---|
| User identity / user ID | Upstream input | Associates trips with a user | `userId` is passed into trip services |
| Module 03 — Destination Discovery & Inspiration | Upstream / potential dependency | Provides place suggestions and place identifiers | The current Module 02 UI uses in-memory stub suggestions instead of making a network call |
| Cloudflare D1 (`TEST_DB`) | Internal infrastructure dependency | Persistence for trips, itineraries, and itinerary items | Used by server actions through `getCloudflareContext()` |

The code does **not** establish a production API call from Module 02 to Module 03. `DayItineraryCard` contains comments referring to Module 03 `DiscoveryService`, but the current implementation explicitly generates lightweight in-memory suggestions and avoids a network call.

Therefore, the interface document should treat Module 03 as a **planned/potential integration**, not as an active external API dependency.

### 3.2 Internal Data Flow

```text
UI Component
    |
    v
Next.js Server Action / Route Handler
    |
    v
Business Logic Service
    |
    v
Data Access Repository
    |
    v
Cloudflare D1 (TEST_DB)
```

For example:

```text
CreateItineraryModal
    -> createItineraryAction()
    -> createItinerary()
    -> itineraryRepository
    -> D1
```

For itinerary items:

```text
DayItineraryCard
    -> createItineraryItemAction()
       OR
       POST /api/itineraries/{itineraryId}/items
    -> createItineraryItem()
    -> itineraryItemRepository
    -> D1
```

### 3.3 Event Broadcast / Callback

No asynchronous event bus, webhook, or external callback mechanism is implemented in the provided source.

The UI instead uses local callbacks after successful operations, for example:

- `onSuccess()`
- `onClose()`
- `onInvalidDate()`
- `onSaveNote(...)`
- `onEditDay(...)`

These are UI callbacks rather than cross-module asynchronous events.

The current source also contains a local `detectConflictSchedule()` function. It calculates overlapping schedule intervals synchronously and returns a `DetectConflictResult`; no external event or callback is shown for broadcasting the result.

---

## 4. Exception Handling and Quick Integration

### 4.1 Error Handling Model

Server actions call the business-logic service and convert unsuccessful service results into JavaScript `Error` objects with a `status` property.

Route handlers then return:

```json
{
  "error": "error message"
}
```

with the corresponding HTTP status.

The source does not define symbolic error-code constants. Therefore, the interface uses the actual HTTP status and messages present in the implementation rather than inventing additional error codes.

### 4.2 Error Code Dictionary

| Error Code / HTTP Status | Cause | Example Message | Troubleshooting |
|---|---|---|---|
| `400` | Required identifier is missing | `Trip ID is required` | Check that the required ID is passed |
| `400` | Required itinerary ID is missing | `Itinerary ID is required` | Verify `itineraryId` |
| `400` | Itinerary item place is missing/invalid | `Place Not Found!` | Supply `place`, `name`, or `destination` |
| `400` | Item note violates Malaysia scope validation | `Itinerary item note must stay within Malaysia` | Remove unsupported/out-of-scope content |
| `404` | Requested itinerary does not exist | `Itinerary not found` | Verify the itinerary ID and parent trip |
| `404` | Requested itinerary item does not exist | `Itinerary item not found` | Verify `itemId` and `itineraryId` |
| `404` | Requested trip does not exist | `Trip not found` | Verify `tripId` |
| `500` | Database/environment binding unavailable | `D1 binding TEST_DB is unavailable` | Check Cloudflare D1 `TEST_DB` binding |
| `500` | Item insertion failed | `Failed to add itinerary item` | Check D1 availability and repository operation |
| `500` | Item update failed | `Failed to update itinerary item` | Check item ID and D1 operation |
| `500` | Item deletion failed | `Failed to delete itinerary item` | Check D1 availability and repository operation |
| `500` | Generic route operation failure | `Failed to create itinerary item` | Inspect server-side error and database state |

### 4.3 Date Validation

The Create Itinerary UI restricts the selected date to the trip's start and end dates. If the date is outside the trip duration, the UI displays:

```text
Date must fall within trip duration
```

The source also shows the application using `Invalid date!` as a UI-level message when the corresponding create operation rejects the date.

---

## 5. Minimal Integration Test Samples

### 5.1 Create Itinerary Item — cURL

The itinerary-item route handler accepts JSON and can be tested with:

```bash
curl -X POST "http://localhost:3000/api/itineraries/iti_123/items"   -H "Content-Type: application/json"   -d '{
    "place": "Batu Caves",
    "destination": "Batu Caves, Selangor, Malaysia",
    "type": "attraction",
    "referenceId": "place_123",
    "note": "Bring water",
    "startTime": "2026-09-02T09:00:00",
    "endTime": "2026-09-02T11:00:00"
  }'
```

Expected successful response:

```json
{
  "item": {
    "id": "itm_...",
    "item_id": "itm_...",
    "itinerary_id": "iti_123",
    "place": "Batu Caves",
    "name": "Batu Caves",
    "item_name": "Batu Caves",
    "destination": "Batu Caves, Selangor, Malaysia",
    "type": "attraction",
    "reference_id": "place_123",
    "start_time": "2026-09-02T09:00:00",
    "end_time": "2026-09-02T11:00:00",
    "position": 1,
    "order_index": 1
  }
}
```

### 5.2 List Itinerary Items — cURL

```bash
curl "http://localhost:3000/api/itineraries/iti_123/items"
```

Expected response shape:

```json
{
  "items": []
}
```

or an array containing the persisted itinerary items.

### 5.3 Update Itinerary Item — cURL

```bash
curl -X PATCH "http://localhost:3000/api/itineraries/iti_123/items/itm_123"   -H "Content-Type: application/json"   -d '{
    "name": "Batu Caves",
    "note": "Bring water and comfortable shoes",
    "startTime": "2026-09-02T09:30:00",
    "endTime": "2026-09-02T11:30:00"
  }'
```

### 5.4 Delete Itinerary Item — cURL

```bash
curl -X DELETE "http://localhost:3000/api/itineraries/iti_123/items/itm_123"
```

Expected successful response:

```json
{
  "ok": true
}
```

---

## 6. Interface Summary

| Interface | Entry Point | Main Purpose | Output |
|---|---|---|---|
| Create Trip | `createTripAction()` | Create a trip | `TripRecord` |
| List Trips | `listTripsAction()` | Retrieve user's trips | `TripRecord[]` |
| Update Trip | `updateTripAction()` | Modify trip details | `TripRecord` |
| Delete Trip | `deleteTripAction()` | Delete a trip | No object |
| Create Itinerary | `createItineraryAction()` | Add a day itinerary | `ItineraryRecord` |
| List Itineraries | `listItinerariesAction()` | Retrieve trip itineraries | `ItineraryRecord[]` |
| Update Itinerary | `updateItineraryAction()` | Modify itinerary details | `ItineraryRecord` |
| Delete Itinerary | `deleteItineraryAction()` | Delete an itinerary | No object |
| Create Itinerary Item | `createItineraryItemAction()` / `POST` | Add a place/item | `ItineraryItemRecord` |
| List Itinerary Items | `listItineraryItemsAction()` / `GET` | Retrieve items | `ItineraryItemRecord[]` |
| Update Itinerary Item | `updateItineraryItemAction()` / `PATCH` / `PUT` | Modify an item | `ItineraryItemRecord` |
| Delete Itinerary Item | `deleteItineraryItemAction()` / `DELETE` | Remove an item | `{ "ok": true }` |

## 7. Scope Notes

This document reflects the interfaces and behavior present in the provided Module 02 source. In particular:

- Trip and itinerary CRUD are currently exposed as Next.js server actions rather than dedicated REST endpoints.
- REST-style route handlers are explicitly implemented for itinerary-item operations.
- Module 03 place suggestions are represented by a local stub in the current `DayItineraryCard`; a real cross-module discovery API is not implemented in the supplied code.
- No asynchronous cross-module event bus, webhook, or callback API is implemented.
- Conflict detection exists as local business logic, but the supplied source does not expose it as a separate external endpoint.
- The source contains both `position` and `order_index` representations for itinerary-item ordering.
