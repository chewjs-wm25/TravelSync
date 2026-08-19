# UI Specification: FR004 - Create Itinerary

## 📍 Overview
This specification details the UI layout, input validation, visual state management, and user interaction flow for **FR004 (Create Itinerary)** within Module 02[cite: 7].

---

## 🎨 Component Placement & Triggers
* **Parent View:** `app/02_Trip_Planning_&_Itinerary_Management/[tripId]/page.tsx`
* **Trigger Element:** 
  * Primary `+ Add Itinerary` button located on the top-right of the Itinerary Timeline/Tab area.
  * Empty State CTA button displayed when a trip has no existing itineraries (`UC02-02 A1 Flow`)[cite: 7].
* **Modal Component:** `app/02_Trip_Planning_&_Itinerary_Management/components/CreateItineraryModal.tsx`

---

## 📝 Form Fields & Controls

| Field Label | Input Type | Validation Rules | Default Value |
| :--- | :--- | :--- | :--- |
| **Itinerary Title** `*` | Text Input | Required, max 60 chars | Auto-generated default: `Day X - [Trip Name]` |
| **Itinerary Date** `*` | Date Picker | Required, ISO format (`YYYY-MM-DD`). Must satisfy `start_date <= input_date <= end_date`[cite: 7, 8]. | Next available date after the last itinerary[cite: 7]. |

---

## ⚡ Interactions & State Handling

### 1. Pre-population Logic
* When the modal opens, auto-calculate the **Itinerary Date**:
  * If itineraries exist: Set default date to `(latest itinerary date + 1 day)`[cite: 7].
  * If no itineraries exist: Set default date to `trip.start_date`[cite: 7].

### 2. Validation & Feedback (Constraint C1)[cite: 7]
* **Out-of-Bounds Date Selected:** If the user selects a date prior to `trip.start_date` or after `trip.end_date`:
  * Prevent form submission.
  * Display inline text error: `Date must fall within trip duration`.
  * Trigger Toast M4: `Invalid date!`[cite: 7].

### 3. Submission Flow
* **Loading State:** Disable submit button, render a loading spinner, and change button label to `Creating...`.
* **Success State:**
  1. Close `CreateItineraryModal`.
  2. Refresh the itinerary timeline view on the parent page[cite: 7].
  3. Display Toast M1: `Itinerary added!`[cite: 7].

---

## Visual Layout Preview (Modal Blueprint)

```text
┌────────────────────────────────────────────────────────┐
│  Create Itinerary                                   ✕  │
│  Add a new day plan to your Malaysia trip workspace.   │
│ ────────────────────────────────────────────────────── │
│                                                        │
│  Itinerary Title *                                     │
│  [ Day 2 - Batu Caves & City Tour                   ]  │
│                                                        │
│  Itinerary Date *                                      │
│  [ 2026-08-14                                    📅 ]  │
│  ℹ️ Must be between 2026-08-13 and 2026-08-18.          │
│                                                        │
│ ────────────────────────────────────────────────────── │
│                                [ Cancel ] [ Add Day ]  │
└────────────────────────────────────────────────────────┘