# Use Case Specification: Manage Travel Note

**Use Case ID:** UC02-04  
**Use Case Name:** Manage Travel Note  
**Author:** Hii Puong Wei  
**Actor:** Traveller  

---

## Description
This use case allows Travellers to add new travel notes into trip and itinerary, delete existing travel notes from trip and itinerary, and edit existing travel notes from trip and itinerary.

---

## Preconditions
1. Traveller is logged into their TravelSync application account.
2. A trip must exist in the trip list.

---

## Postconditions
- The travel note is added into the itinerary.
- The travel note is edited within the itinerary.
- The travel note is removed from the itinerary.
- The travel note is added into the trip.
- The travel note is edited within the trip.
- The travel note is removed from the trip.

---

## Basic Flow

| Traveller | System |
| :--- | :--- |
| | This use case starts when the system items the trip details. |
| | The system retrieves all travel notes data. |
| | The system checks whether existing travel notes are found. |
| | If existing travel notes exist, the system items the travel notes. |
| Traveller selects add trip travel note [FR02-10]<br>*(Alternative: [A1: Traveller selects delete trip travel note], [A2: Traveller selects edit trip travel note], [A3: Traveller selects add itinerary travel note], [A4: Traveller selects delete itinerary travel note], [A5: Traveller selects edit itinerary travel note])* | |
| | The system adds an empty travel note into the trip detail. |
| | The system saves and updates the trip details. |
| | The system displays a new note added message [M1: New notes added!]. |
| | This use case ends here. |

---

## Alternative Flow

### A1: Traveller selects delete trip travel note [FR02-11]
* **A1-1:** Traveller selects delete travel note.
* **A1-2:** The system prompts user to confirm.
* **A1-3:** Traveller selects confirm.
* **A1-4:** The system removes the travel note from the trip detail.
* **A1-5:** The system saves and updates the trip details.
* **A1-6:** The system displays note removed message [M2: Notes Removed!].
* **A1-7:** This use case ends here.

### A2: Traveller selects edit trip travel note [FR02-12]
* **A2-1:** Traveller selects edit travel note.
* **A2-2:** The system prompts user to input descriptions.
* **A2-3:** Traveller inputs description.
* **A2-4:** Traveller selects confirm.
* **A2-5:** The system saves and updates the trip details.
* **A2-6:** This use case ends here.

### A3: Traveller selects add itinerary item travel note [FR02-10]
* **A3-1:** Traveller selects add travel note within the itinerary item.
* **A3-2:** The system adds an empty travel note into the itinerary item.
* **A3-3:** The system saves and updates the itinerary item.
* **A3-4:** The system displays a new note added message [M1: New notes added!].
* **A3-5:** This use case ends here.

### A4: Traveller selects delete itinerary travel note [FR02-11]
* **A4-1:** Traveller selects delete travel note.
* **A4-2:** The system prompts user to confirm.
* **A4-3:** Traveller selects confirm.
* **A4-4:** The system removes the travel note from the itinerary.
* **A4-5:** The system saves and updates the itinerary.
* **A4-6:** The system displays note removed message [M2: Notes Removed!].
* **A4-7:** The use case ends here.

### A5: Traveller selects edit itinerary travel note [FR02-12]
* **A5-1:** Traveller selects edit travel note.
* **A5-2:** The system prompts user to input descriptions.
* **A5-3:** Traveller inputs description.
* **A5-4:** Traveller selects confirm.
* **A5-5:** The system saves and updates the itinerary.
* **A5-6:** The use case ends here.

---

## Messages

| Code | Message Name | Content |
| :--- | :--- | :--- |
| **M1** | New notes added! | `Note Added!` |
| **M2** | Notes Removed! | `Note Removed!` |
