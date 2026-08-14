# Entity Relationship Diagram & Schema Documentation

## 1. Visual ER Diagram

```mermaid
erDiagram
    Trip ||--o{ Itinerary : "contains (1-to-N)"
    Itinerary ||--o{ Itinerary_Item : "contains (1-to-N)"

    Trip {
        VARCHAR TripID PK
        VARCHAR TripName
        DATE StartDate
        DATE EndDate
        TEXT TripNote
        VARCHAR UserID FK
    }

    Itinerary {
        VARCHAR ItineraryID PK
        VARCHAR Title
        DATE Date
        VARCHAR TripID FK
    }

    Itinerary_Item {
        VARCHAR ItemID PK
        VARCHAR ItemName
        ENUM Type
        VARCHAR ReferenceID
        VARCHAR Destination
        DATETIME StartTime
        DATETIME EndTime
        TEXT ItineraryNote
        VARCHAR ItineraryID FK
    }