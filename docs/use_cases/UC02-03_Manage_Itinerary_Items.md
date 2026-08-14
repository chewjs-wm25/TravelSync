# Use Case Specification: Manage Itinerary Items

**Use Case ID:** UC02-03  
**Use Case Name:** Manage Itinerary Items  
**Author:** Hii Puong Wei  
**Actor:** Traveller  

---

## Description
This use case allows Travellers to add new itinerary items into an itinerary, delete existing itinerary items from within the itinerary, and edit existing itinerary items from within the itinerary by changing the duration/start-end time and travel mode.

---

## Preconditions
1. Traveller is logged into their TravelSync application account.
2. A trip must exist in the trip list.
3. An itinerary must exist in the trip.

---

## Postconditions
- The itinerary item is added into the itinerary.
- The itinerary item is edited within the itinerary.
- The itinerary item may be removed from the itinerary.

---

## Basic Flow

| Traveller | System |
| :--- | :--- |
| | The use case starts when the system displays trip details. |
| | The system retrieves all itinerary items data. |
| | The system checks whether itinerary items exist. |
| | If itinerary items exist, the system displays all itinerary items [A1: Itinerary items not exist]. |
| Traveller selects add new itinerary items [FR02-07]<br>*(Alternative: [A2: Select delete itinerary items], [A3: Select edit itinerary items])* | The system prompts traveller for new place. |
| Traveller inputs new place. | |
| | The system checks whether the place is valid [C1: Place Rule]. |
| | If the place is valid, the system checks for existing itinerary items [A4: Invalid Place]. |
| | If existing itinerary items are found, the system calculates travel time [UC04-01] from the place of existing itinerary items. |
| | The system adds the new place [UC03-01]. |
| | The system adds travel time based on calculated travel time by car from the existing place to the new place. |
| | The system adds the calculated travel time by car in between the existing itinerary items and the new place. |
| | The system adds the new place as a new itinerary item. |
| | The system saves and updates the new itinerary items into the itinerary. |
| | The system displays message of new place added [M1: New place added]. |
| | This use case ends here. |

---

## Alternative Flow

### A1: Itinerary items not exist
* **A1-1:** The system adds the new place.
* **A1-2:** The system returns to Basic Flow Step 14.

### A2: Select delete itinerary items [FR02-08]
* **A2-1:** Traveller selects delete itinerary items.
* **A2-2:** The system prompts traveller to confirm.
* **A2-3:** Traveller selects confirm.
* **A2-4:** The system checks existing itinerary items before the current itinerary item.
* **A2-5:** If exist, the system checks existing itinerary items after the current itinerary item [A5: Itinerary items before current item do not exist].
* **A2-6:** If exist, the system calculates travel time by car [UC04-01] between the itinerary item before and after the current itinerary item [A6: Itinerary items after current item do not exist].
* **A2-7:** The system removes the current itinerary item.
* **A2-8:** The system saves and updates the new calculated travel time by car and the removed itinerary item.
* **A2-9:** The use case ends here.

### A3: Select edit itinerary items [FR02-09]
* **A3-1:** Traveller selects edit duration time for the itinerary item [A7: Select Different Travel Mode].
* **A3-2:** The system prompts user for start time and end time.
* **A3-3:** Traveller inputs start time and end time.
* **A3-4:** The system checks whether the start time and end time are valid [C2: Duration Rule].
* **A3-5:** If valid, the system detects conflicting schedule [FR02-13] with existing itinerary items before and after the current itinerary item [A8: Start time and end time not valid].
* **A3-6:** If no conflict, the system shall add the duration time into the itinerary item [A9: Conflict schedule detected].
* **A3-7:** The system saves and updates the itinerary item.
* **A3-8:** The use case ends here.

### A4: Invalid Place
* **A4-1:** The system displays place not found message [M2: Place not found].
* **A4-2:** The system returns to Basic Flow Step 6.

### A5: Itinerary items before the current itinerary item do not exist
* **A5-1:** If itinerary items before the current itinerary item do not exist, the system checks existing itinerary items after the current itinerary item.
* **A5-2:** If exist, the system removes the calculated travel time by car between the current itinerary item and the itinerary item after [A6: Itinerary items after current item do not exist].
* **A5-3:** The system saves and updates the itinerary.
* **A5-4:** This use case ends here.

### A6: Itinerary items after the current itinerary item do not exist
* **A6-1:** If itinerary items after the current itinerary item do not exist, the system removes the current itinerary item.
* **A6-2:** The system saves and updates the itinerary.
* **A6-3:** This use case ends here.

### A7: Select Different Travel Mode
* **A7-1:** Traveller selects travel mode by foot [A10: Travel mode by train].
* **A7-2:** The system switches display of calculated travel time from by car to by foot.
* **A7-3:** The system saves and updates the travel mode to by foot.
* **A7-4:** The use case ends here.

### A8: Start time and end time not valid
* **A8-1:** The system displays invalid time message [M3: Invalid Time].
* **A8-2:** The system returns to Alternative Flow A3-2.

### A9: Conflict schedule detected
* **A9-1:** The system displays time conflict detected message [M4: Time conflict detected].
* **A9-2:** The system returns to Alternative Flow A3-2.

### A10: Travel mode by train
* **A10-1:** Traveller selects travel mode by train.
* **A10-2:** The system switches display of calculated travel time from by car to by train.
* **A10-3:** The system saves and updates the travel mode to by train.
* **A10-4:** The use case ends here.

---

## Messages

| Code | Message Name | Content |
| :--- | :--- | :--- |
| **M1** | New place added | `Place Added!` |
| **M2** | Place not found | `Place Not Found!` |
| **M3** | Invalid Time | `Invalid Time!` |
| **M4** | Time conflict detected | `Conflicting Time Detected!` |

---

## Constraints

### C1: Place Rule
The system shall only return `TRUE` when:
- **IF** The place exists within the region
- **THEN** RETURN `TRUE`
- **ELSE** RETURN `FALSE`

### C2: Duration Rule
The system shall only return `TRUE` when:
- **IF** `start time` < `end time`
- **THEN** RETURN `TRUE`
- **ELSE** RETURN `FALSE`
