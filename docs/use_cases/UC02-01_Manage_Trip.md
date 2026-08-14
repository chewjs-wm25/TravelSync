# Use Case Specification: Manage Trip

**Use Case ID:** UC02-01_Manage_Trip  
**Use Case Name:** Manage Trip  
**Author:** Hii Puong Wei  
**Actor:** Traveller  

---

## Description
This use case allows Travellers to create a new trip into the trip list, delete existing trips from within the trip list, and edit existing trips from within the trip list.

---

## Precondition
Traveller is logged into their TravelSync application account.

---

## Postcondition
- If create trip is selected, new trip is created into the trip list.
- If edit trip is selected, the trip is updated within the trip list.
- If delete trip is selected, the trip is removed from the trip list.

---

## Basic Flow

| Traveller | System |
| :--- | :--- |
| This use case starts when the traveller opens the Trip Planning page. | The system retrieves the trip list data. |
| | The system checks whether any trip exists [A1: No existing trip found]. |
| | If trip exists, the system displays the existing trip in the trip list. |
| Traveller selects create a new trip [FR02-01]<br>*(Alternative: [A2: Traveller selects an edit trip], [A3: Traveller selects delete an existing trip])* | The system displays a pop up dialog for create trip. |
| | The system prompts traveller for a location. |
| | The system prompts traveller for trip date by selecting start date and end date. |
| Traveller inputs trip location. | |
| Traveller selects trip date. | |
| Traveller selects confirm. | |
| | The system checks whether the location is valid [C1: Location Rule]. |
| | If the location is valid, proceed with checking the trip date [A4: Invalid Location]. |
| | The system checks whether traveller input trip date is valid [C2: Trip Date Rule]. |
| | If trip date is valid, a new trip is created [A5: Trip date invalid] [A6: Trip date is empty]. |
| | The system adds the new trip into trip list. |
| | The system saves and updates the trip list. |
| | The system displays new trip created message [M1: Trip Successfully Created]. |

---

## Alternative Flow

### A1: No existing trip found
* **A1-1:** The system displays a page with message of no trip found [M2: No Trip Found].
* **A1-2:** Traveller selects create a new trip [FR02-01].
* **A1-3:** The system returns to Basic Flow Step 7.

### A2: Traveller selects edit trip [FR02-03]
* **A2-1:** Traveller selects rename trip [A7: Traveller selects replace image].
* **A2-2:** The system displays current trip name.
* **A2-3:** The system prompts traveller for a new trip name.
* **A2-4:** Traveller selects confirm.
* **A2-5:** The system saves and updates the new trip name.
* **A2-6:** The system displays trip updated message [M3: Trip successfully updated].
* **A2-7:** The system returns to Basic Flow Step 2.

### A3: Traveller selects delete trip [FR02-02]
* **A3-1:** Traveller selects delete trip.
* **A3-2:** The system prompts traveller to confirm deletion.
* **A3-3:** Traveller selects confirm.
* **A3-4:** The system removes the trip from the trip list.
* **A3-5:** The system displays trip removed successfully [M4: Trip successfully removed].
* **A3-6:** The use case ends here.

### A4: Invalid location
* **A4-1:** The system displays location not found message [M5: Location not found].
* **A4-2:** The system returns to Basic Flow Step 7.

### A5: Trip date Invalid
* **A5-1:** The system displays message invalid trip date [M6: Invalid Trip date].
* **A5-2:** The system returns to Basic Flow Step 8.

### A6: Traveller does not input trip date
* **A6-1:** The system creates a new trip.
* **A6-2:** The system returns to Basic Flow Step 16.

### A7: Traveller Selects Replace Image
* **A7-1:** The system prompts user to upload image.
* **A7-2:** Traveller uploads a new image.
* **A7-3:** Traveller selects confirm.
* **A7-4:** The system saves and updates the new image.
* **A7-5:** The system returns to Alternative Flow Step A2-6.

---

## Messages

| Code | Message Name | Content |
| :--- | :--- | :--- |
| **M1** | Trip Successfully Created | `Trip Successfully Created!` |
| **M2** | No Trip Found | `No Trip Found!` |
| **M3** | Trip successfully updated | `Trip Updated Successfully!` |
| **M4** | Trip successfully removed | `Trip Removed Successfully` |
| **M5** | Location not found | `Location Does Not Exist!` |

---

## Constraints

### C1: Location Rule
The System shall only return true when:
- The location is existing only within Malaysia.

### C2: Trip Date Rule
The system shall only return true when:
- **IF** `StartDate` <= `EndDate`
- **THEN** RETURN `TRUE`
