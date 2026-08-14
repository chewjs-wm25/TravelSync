# Use Case Specification: Manage Itinerary

**Use Case ID:** UC02-02  
**Use Case Name:** Manage Itinerary  
**Author:** Hii Puong Wei  
**Actor:** Traveller  

---

## Description
This use case allows Travellers to create a new itinerary within the trip, delete an existing itinerary from within the trip, and edit an existing itinerary from within the trip by changing the title, description, and date.

---

## Preconditions
1. Traveller is logged into their TravelSync application account.
2. A trip must exist in the trip list.

---

## Postconditions
- **If Create Itinerary is selected:** A new itinerary is created in the itinerary list.
- **If Edit Itinerary is selected:** The itinerary is updated within the itinerary list.
- **If Delete Itinerary is selected:** The itinerary is removed from the itinerary list.

---

## Basic Flow

| Traveller | System |
| :--- | :--- |
| | The use case starts when the system displays trip details. |
| | The system retrieves all itinerary data. |
| | The system checks whether any itinerary exists. |
| | If itinerary exists, the system displays all trip details with all existing itineraries [A1: No existing itinerary found]. |
| Traveller selects create itinerary [FR02-04]<br>*(Alternative: [A2: Traveller selects delete itinerary], [A3: Traveller selects edit itinerary])* | |
| | The system creates a new empty itinerary. |
| | The system adds the new itinerary one day after the last itinerary into the itinerary list. |
| | The system saves and updates the itinerary list. |
| | The system displays itinerary successfully added message [M1: Itinerary Successfully added]. |
| | The use case ends here. |

---

## Alternative Flow

### A1: No existing itinerary found
* **A1-1:** If itinerary not found, the system checks the trip date.
* **A1-2:** If trip date does not exist, the system displays an empty itinerary list [A4: Trip date exist].
* **A1-3:** This use case ends here.

### A2: Traveller selects delete itinerary [FR02-05]
* **A2-1:** Traveller selects delete itinerary.
* **A2-2:** The system prompts traveller to confirm removal.
* **A2-3:** Traveller selects confirm.
* **A2-4:** The system removes the itinerary from the itinerary list.
* **A2-5:** The system saves and updates the itinerary list.
* **A2-6:** The system displays itinerary removed successfully message [M2: Itinerary Successfully removed].
* **A2-7:** The use case ends here.

### A3: Traveller selects edit itinerary [FR02-06]
* **A3-1:** Traveller selects edit title [A5: Traveller selects edit description] [A6: Traveller selects edit date].
* **A3-2:** The system prompts traveller for title.
* **A3-3:** Traveller inputs new itinerary title.
* **A3-4:** The system saves and updates itinerary title.
* **A3-5:** The system displays itinerary successfully updated message [M3: Itinerary Successfully Updated].
* **A3-6:** The use case ends here.

### A4: Trip date exist
* **A4-1:** The system creates one itinerary for each day based on the trip date.
* **A4-2:** The system returns to Basic Flow Step 8.

### A5: Traveller selects edit description
* **A5-1:** The system prompts traveller for description.
* **A5-2:** Traveller selects confirm.
* **A5-3:** The system saves and updates itinerary description.
* **A5-4:** The system displays itinerary successfully updated message [M3: Itinerary Successfully Updated].
* **A5-5:** The use case ends here.

### A6: Traveller selects edit date
* **A6-1:** Traveller selects new itinerary date.
* **A6-2:** The system checks whether traveller input itinerary date is valid [C1: Add itinerary Date Rule].
* **A6-3:** If itinerary date is valid, the system updates and saves the itinerary date [A7: Itinerary date not valid].
* **A6-4:** The system displays itinerary successfully updated message [M3: Itinerary Successfully Updated].
* **A6-5:** The use case ends here.

### A7: Itinerary date not valid
* **A7-1:** The system displays itinerary date invalid message [M4: Invalid Date].
* **A7-2:** The system returns to Alternative flow A6.

---

## Messages

| Code | Message Name | Content |
| :--- | :--- | :--- |
| **M1** | Itinerary Successfully added | `Itinerary added!` |
| **M2** | Itinerary Successfully removed | `Itinerary Removed!` |
| **M3** | Itinerary Successfully Updated | `Itinerary Updated!` |
| **M4** | Invalid Date | `Invalid date!` |

---

## Conditions / Constraints

### C1: Add itinerary Date Rule
The system shall only return `TRUE` when:
- **IF** `(start date + 1 day)` <= `input date` <= `(end date + 1 day)`
- **THEN** RETURN `TRUE`
