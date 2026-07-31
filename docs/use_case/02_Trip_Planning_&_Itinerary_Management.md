# Use Case Description — 模块 02：行程与路线规划 (Trip Planning & Itinerary Management)

---

## UCD001: Manage Trip

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UCD001 | |
| **Use Case Name**: | Manage Trip | |
| **Actor**: | Traveller | |
| **Description**: | Allows the traveller to create, edit, and delete trip information. Creating a trip automatically includes creating an itinerary. | |
| **Precondition**: | Traveller is logged into the system. | |
| **Postcondition**: | The trip is created, updated, or deleted successfully. If a new trip is created, an itinerary is automatically created and associated with it. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller selects Manage Trip. | 2. System displays the trip management page. | |
| 3. Traveller chooses to create, edit, or delete a trip. | 4. System displays the corresponding form or confirmation dialog. | |
| 5. Traveller enters or updates trip information, or confirms deletion. | 6. System validates the request.<br>7. System automatically creates a new itinerary.<br>8. System saves or deletes the trip.<br>9. System displays a success message and updates the trip list. | |
| | | |
| **Alternative Flow** | | |
| A1: Invalid Information | | |
| A1.1: System detects missing or invalid fields. | | |
| A1.2: Error message is displayed. | | |
| A1.3: Traveller corrects the information. | | |
| A2: Delete Cancelled | | |
| A2.1: Traveller cancels deletion. | | |
| A2.2: System returns to the trip management page. | | |
| | | |
| **Message** | | |
| E1: System fails to save or delete the trip due to a database or server error. | | |
| E2: The requested trip cannot be found. | | |

<br>

## UCD002: Create Itinerary

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UCD002 | |
| **Use Case Name**: | Create Itinerary | |
| **Actor**: | Traveller | |
| **Description**: | Automatically creates an empty itinerary when a new trip is created. | |
| **Precondition**: | A new trip is successfully created. | |
| **Postcondition**: | A new empty itinerary is created and linked to the newly created trip. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Manage Trip requests itinerary creation. | 2. System creates a new itinerary linked to the trip.<br>3. System initializes itinerary according to the trip duration.<br>4. System saves the itinerary. | |
| | | |
| **Alternative Flow** | | |
| A1: Trip creation fails | | |
| A1.1: System does not create the itinerary. | | |
| A1.2: Traveller is notified. | | |

<br>

## UCD003: View Trip List

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UCD003 | |
| **Use Case Name**: | View Trip List | |
| **Actor**: | Traveller | |
| **Description**: | Displays all trips belonging to the traveller. | |
| **Precondition**: | Traveller is logged in. | |
| **Postcondition**: | The Traveller views the list of available trips. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller selects My Trips. | 2. System retrieves trip information.<br>3. System displays trip list. | |
| | | |
| **Alternative Flow** | | |
| A1: Trip not existed | | |
| A1.1: No Trips exist. | | |
| A1.2: System displays an empty trip list. | | |

<br>

## UCD004: Manage Itinerary Item

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UCD004 | |
| **Use Case Name**: | Manage Itinerary Item | |
| **Actor**: | Traveller | |
| **Description**: | Allows the traveller to add, edit, delete, or reorder itinerary items. | |
| **Precondition**: | A trip and itinerary exist. | |
| **Postcondition**: | The itinerary item is added, edited, deleted, or reordered successfully, and the itinerary is updated. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller opens an itinerary. | 2. System displays itinerary items. | |
| 3. Traveller chooses to add, edit, delete, or reorder an itinerary item. | 4. System displays the appropriate interface. | |
| 5. Traveller enters or modifies itinerary information. | 6. System validates the information.<br>7. System calculates travel time.<br>8. System detects schedule conflicts.<br>9. System saves the changes.<br>10. System updates the itinerary timeline. | |
| | | |
| **Alternative Flow** | | |
| A1: Schedule Conflict | | |
| A1.1: System detects overlapping activities. | | |
| A1.2: Warning is displayed. | | |

---

## 模板 (Template for Future Use Cases)

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC`Module ID`-`Index` | |
| **Use Case Name**: | XX | |
| **Actor**: | XXX | |
| **Description**: | XXX | |
| **Precondition**: | XXX | |
| **Postcondition**: | XXX | |
| | | |
| **Basic Flow** | | |
| | | |
| **Actor_Name** | **System** | **API** |
| 1. XXX | | |
| 2. XXX | | |
| 3. XXX | | |
| | 4. XXX [M1: XXX] [C1: XXX] | |
| | 5. XXX [A1: XXX] | |
| | | |
| **Alternative Flow** | | |
| A1: XXX | | |
| A1.1: XXX | | |
| A1.2: XXX | | |
| | | |
| **Message** | | |
| M1: "..." | | |
| | | |
| **Condition** | | |
| C1: ... | | |
