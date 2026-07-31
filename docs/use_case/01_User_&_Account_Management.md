# Use Case Description — 模块 01：用户与账户 (User & Account Management)

---

## UC01-AM-01: Register

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC01-AM-01 | |
| **Use Case Name**: | Register | |
| **Actor**: | Traveller | |
| **Description**: | Allows a new user to create an account by providing personal information and credentials. | |
| **Precondition**: | Traveller is on the registration page and does not have an existing account. | |
| **Postcondition**: | A new user account is successfully created and stored in the database. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller navigates to the registration page. | 2. System displays the registration form. | |
| 3. Traveller fills in required details.<br>4. Traveller ticks the "Terms and Conditions" checkbox.<br>5. Traveller submits the registration form. | 6. System validates the provided information.<br>7. System creates a new account with "Pending" status.<br>8. System sends a verification email to the registered email address. [M1]<br>9. System displays a success message. [M2] | |
| | | |
| **Alternative Flow** | | |
| A1: Invalid Input | | |
| A1.1: System detects missing or invalid fields. | | |
| A1.2: System displays error messages. [M3] | | |
| | | |
| **Message** | | |
| M1: "A verification email has been sent to your registered email address." | | |
| M2: "Registration successful! Please check your email to verify your account." | | |

<br>

## UC01-AM-02: Login

| | | |
| :--- | :--- | :--- |
| **Use Case ID**: | UC01-AM-02 | |
| **Use Case Name**: | Login | |
| **Actor**: | Traveller, Administrator | |
| **Description**: | Allows registered users to authenticate and gain access to the TravelSync system. | |
| **Precondition**: | Traveller has a valid registered account and is on the login page. | |
| **Postcondition**: | Traveller is successfully authenticated and granted access to the system. | |
| | | |
| **Basic Flow** | | |
| | | |
| **Traveller** | **System** | **API** |
| 1. Traveller navigates to the login page. | 2. System displays the login form. | |
| 3. Traveller enters registered email/username and password.<br>4. Traveller submits the login credentials. | 5. System validates the credentials against the database.<br>6. System verifies that the account is activated.<br>7. System generates a session token.<br>8. System grants access and redirects to the dashboard. [M1] | |
| | | |
| **Alternative Flow** | | |
| A1: Invalid Credentials | | |
| A1.1: System validates credentials and finds them incorrect. | | |
| A1.2: System displays error message. [M2] | | |
| | | |
| **Message** | | |
| M1: "Login successful! Welcome back." | | |
| M2: "Invalid email or password. Please try again." | | |

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
