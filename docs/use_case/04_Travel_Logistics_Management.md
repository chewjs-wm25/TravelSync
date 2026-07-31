# Use Case Description — 模块 04：物流与路线规划 (Travel Logistics Management)

---

## UC-TN-01: Generate Route

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC-TN-01 | |
| **Use Case Name**: | Generate Route | |
| **Actor**: | Traveller | |
| **Description**: | Allows the traveller to create a route by adding stops and viewing it on a map with details. | |
| **Precondition**: | Traveller is logged in. | |
| **Postcondition**: | A new route is generated and displayed on the map with stop details. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller navigates to "Generate Route" page. | 2. System displays an empty map. | |
| 3. Traveller inputs departure location and destination location. | 4. System adds stop to list and places marker on map. | |
| 5. Traveller selects vehicle type.<br>6. Traveller clicks "Generate Route". | 7. System performs Include: Calculate Travel Time.<br>8. System displays route path, markers, total distance, and travel time. | |
| | | |
| **Alternative Flow** | | |
| A1: Invalid Location | | |
| A1.1: Traveller enters an invalid location. | | |
| A1.2: System displays error message. | | |

<br>

## UC-TN-03: Optimize Route

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC-TN-03 | |
| **Use Case Name**: | Optimize Route | |
| **Actor**: | Traveller | |
| **Description**: | Allows the traveller to automatically reorder stops for the fastest, shortest, or cheapest route. | |
| **Precondition**: | Traveller has generated a route. | |
| **Postcondition**: | System displays an optimized route order. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller clicks "Optimize Route".<br>2. Traveller selects optimization type. | 3. System calculates the optimized route.<br>4. System displays the optimized route on map. | |
| 5. Traveller applies the optimization. | 6. System updates route order and displays new times. | |

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
