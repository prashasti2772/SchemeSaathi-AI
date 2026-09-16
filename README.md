# SchemeSaathi

### Government Scheme Discovery & Eligibility Platform

**Developed by Prashasti Srivastava**

SchemeSaathi is a full-stack web platform designed to make government scheme discovery easier and more accessible.

Instead of manually searching through multiple schemes and eligibility rules, users can enter their basic profile and business details to receive relevant scheme recommendations along with eligibility explanations, required documents, benefits, and official references.

🌐 **Live Website:**  
https://schemesathi-ai-26kj.onrender.com

---

## ✨ Key Features

### 🔎 Personalized Scheme Matching

Users can receive scheme recommendations based on details such as:

- Age
- Gender
- Annual family income
- Social category
- Disability status
- Rural residence
- State
- District
- Business or activity information

The backend evaluates the supplied details against the available scheme catalogue and returns relevant matches.

---

### 📋 Detailed Scheme Information

Users can review useful information for matching schemes, including:

- Eligibility details
- Benefits
- Required documents
- Matching reasons
- Official references and application links

Scheme recommendations are intended to help users discover suitable opportunities more easily.

---

### 🔐 Secure Authentication

SchemeSaathi includes a complete user authentication flow with:

- User registration
- Secure password hashing
- Login
- JWT-based authentication
- Email OTP verification
- Forgot-password verification
- Secure password reset

Email OTPs are delivered using **Brevo**.

**SMS-based authentication is not required.**

---

### 💬 Scheme Assistant

The built-in Scheme Assistant helps users understand and navigate the available scheme information.

It can assist with questions related to:

- Eligibility
- Scheme benefits
- Required documents
- Application guidance
- Scheme comparison
- Profile-based recommendations
- Website navigation and support

The assistant uses the available scheme catalogue and backend retrieval system to provide relevant responses.

---

### 🎙️ Voice Assistance

The project also includes a voice-assistance module for easier interaction.

The voice workflow supports speech input, language processing, scheme-related responses, and audio output through the configured language services.

---

### 🗺️ State & District Selection

SchemeSaathi provides structured state and district selection so users can provide accurate location information while searching for relevant schemes.

Changing the selected state automatically updates the available districts.

---

### 🧑‍💼 User Profile

Registered users can manage their profile information and use those details while accessing scheme-related services.

---

### 🎫 Help & Support

Users can access the **Help & Support** section to raise support requests and track their submitted tickets.

Support can be used for issues related to:

- Login
- Password recovery
- Account access
- Scheme matching
- Scheme information
- Website functionality
- Other user queries

📧 **Customer Care:**  
customercareprashasti@gmail.com

---

## 🛠️ Technology Stack

### Frontend

- React
- Vite
- JavaScript
- HTML
- CSS

### Backend

- Python
- REST APIs
- FastAPI

### Database

- PostgreSQL — production
- SQLite — local development

### Authentication

- JWT authentication
- Password hashing
- Email OTP verification
- Brevo transactional email service

### Deployment & Development

- Git
- GitHub
- Docker
- Render
- VS Code

---

## ⚙️ How SchemeSaathi Works

```text
Create Account / Sign In
          ↓
Complete User Details
          ↓
Enter Eligibility & Business Information
          ↓
Backend Evaluates Scheme Criteria
          ↓
Relevant Schemes Are Matched
          ↓
View Eligibility Reasons
          ↓
Check Benefits & Required Documents
          ↓
Visit Official Source for Further Action
