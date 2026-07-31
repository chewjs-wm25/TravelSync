# Use Case Description — 模块 05：协同合作 (Collaboration & Shared Planning)

---

## UC-Collab-01: Invite Collaborators

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC-Collab-01 | |
| **Use Case Name**: | Invite Collaborators | |
| **Actor**: | Traveller | |
| **Description**: | Allows the Traveller to invite other users to join a travel plan as collaborators. | |
| **Precondition**: | A travel plan exists, and the Traveller is logged in and verified as the owner. | |
| **Postcondition**: | A collaborator record is successfully created in the database with a "Pending" status, and an email invitation is dispatched. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller selects "Invite Collaborators". | 2. System displays the invitation interface and modal. | |
| 3. Traveller inputs collaborator's email and selects a role from the dropdown. | 4. System performs validation and maps the assigned access rights. | |
| 5. Traveller clicks the "Send Invitation" button. | 6. System validates the email format.<br>7. System generates an invitation link, saves the status as "Pending", and sends an invitation email.<br>8. System displays confirmation that the invitation was sent successfully. | |
| | | |
| **Alternative Flow** | | |
| A1: Email Already Invited | | |
| A1.1: System detects that the email has already been invited. | | |
| A1.2: System alerts the user. | | |

<br>

## UC-Collab-02: Manage Roles & Permissions

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC-Collab-02 | |
| **Use Case Name**: | Manage Roles & Permissions | |
| **Actor**: | Traveller | |
| **Description**: | Configures and maps specific access privileges (Viewer or Editor rights) to collaborator accounts. | |
| **Precondition**: | An active collaboration invitation or setting modification is currently in progress. | |
| **Postcondition**: | The collaborator's record is assigned specific permission rules. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller selects a role for the collaborator. | 2. System loads the specific access definitions and permission schemas. | |
| 3. Traveller confirms the role setup. | 4. System updates the metadata record.<br>5. System returns access validation confirmation to the parent flow. | |
| | | |
| **Alternative Flow** | | |
| A1: Upgrading Viewer to Editor Role | | |
| A1.1: Traveller changes role from Viewer to Editor. | | |
| A1.2: System displays a warning. | | |

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
