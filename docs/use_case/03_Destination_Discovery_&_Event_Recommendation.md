# Use Case Description — 模块 03：目的地与活动 (Destination Discovery & Event Recommendation)

---

## UC03-Search_Location: Search Location

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC03-Search_Location | |
| **Use Case Name**: | Search Location | |
| **Actor**: | Traveller, Map Service API | |
| **Description**: | Let user search for specific location by typing keyword and selecting type filter. | |
| **Precondition**: | Map is loaded, Traveller active the search bar. | |
| **Postcondition**: | The map center relocates to the target location, and a location pin is displayed. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller enter keyword in search bar. | | |
| 2. Traveller pick a type filter. | | |
| 3. Traveller request search location. | 4. System combine the keyword and type filter into a search request. | 5. System send search request to Map Service API. |
| | | 6. Map Service API return a list of location. |
| | 7. System display the list of location. | |
| 8. Traveller pick a location. | 9. System clear previous location pin.<br>10. System draw a new pin for location selected.<br>11. Move the map center to the location.<br>12. System display the basic information of the location. | |
| | | |
| **Alternative Flow** | | |
| A1: Traveller re-enter a new keyword | | |
| A1.1: Use Case return to BF-3 | | |
| A3: No result | | |
| A3.1: System display error message [M1: No result] | | |
| | | |
| **Message** | | |
| M1: "No result found" | | |
| M2: "Search is unavailable Please try later" | | |

<br>

## UC03-View_Location_Details: View Location Details

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC03-View_Location_Details | |
| **Use Case Name**: | View Location Details | |
| **Actor**: | Traveller, Map Service API | |
| **Description**: | Show the detail information about the location to Traveller. | |
| **Precondition**: | Location Pin is exist. | |
| **Postcondition**: | A sidebar expands, displaying the detail information about the location. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller click view detail. | 2. System generate a detail information request.<br>3. System request detail information from Map Service API. | 4. Map Service API return the detail information about the location. |
| | 5. Display the detail information on sidebar. | |
| | | |
| **Alternative Flow** | | |
| A1: API not responding | | |
| A1.1: System display error message [M1: API not responding]. | | |

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
