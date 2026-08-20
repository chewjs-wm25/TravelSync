# UI Specification: FR001 (Create Trip)

**Requirement ID:** FR001  
**Use Case Reference:** UC02-01_Manage_Trip  
**Target File:** `app/02_Trip_Planning_&_Itinerary_Management/components/CreateTripModal.tsx`  
**Database Targets:** `trips` (`trip_id`, `user_id`, `trip_name`, `start_date`, `end_date`, `trip_note`)

---

## 1. Overview & Triggers

The **Create Trip Modal** enables users to initialize a new itinerary workspace scoped to **Malaysia**. It can be triggered from:
* Top bar action: **"+ Start New Trip"** button.
* Dashboard empty state card: **"+ Plan A New Trip"**.

---

## 2. Modal UI Component Matrix

| Field Label | Form Attribute | Input Control | Required? | Validation Rules & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| **Trip Name** | `trip_name` | Text Input | **Yes** | Cannot be empty. Max 100 characters. |
| **Destination / Note** | `trip_note` | Text Area | Optional | Overview note or initial summary. |
| **Start Date** | `start_date` | Date Picker | Optional | Format `YYYY-MM-DD`. Must comply with Constraint C2. |
| **End Date** | `end_date` | Date Picker | Optional | Format `YYYY-MM-DD`. Must be `>= start_date`. |

---

## 3. Form Execution Flow (4-Tier)

1. **Presentation Layer (`CreateTripModal.tsx`):**
   * Collects `trip_name`, `start_date`, `end_date`, and `trip_note`.
2. **Business Logic Layer (`business_logic_layer/02_.../tripService.ts`):**
   * Validates date logic (`start_date <= end_date`).
   * Verifies destination constraint (Malaysia context).
3. **Data Access Layer (`data_access_layer/02_.../tripRepository.ts`):**
   * Generates `trip_id` (UUID).
   * Executes SQL `INSERT INTO trips (trip_id, user_id, trip_name, start_date, end_date, trip_note) VALUES (...)`.
4. **UI Response Handling:**
   * Closes modal on success and renders toast alert **M1**.