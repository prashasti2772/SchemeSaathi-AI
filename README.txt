# SchemeSaathi

## Government Scheme Discovery & Eligibility Platform

**Designed and Developed by Prashasti Srivastava**

SchemeSaathi is a full-stack web platform that helps users discover relevant government schemes based on their profile, eligibility and requirements.

Instead of manually searching through multiple schemes, users can provide their basic personal, location and business details to receive relevant scheme recommendations along with eligibility explanations, required documents, benefits and official references.

### 🌐 Live Website

https://schemesathi-ai-26kj.onrender.com

---

## ✨ Key Features

### 🔎 Personalized Scheme Matching

SchemeSaathi recommends schemes using information provided by the user, including:

- Age
- Gender
- Annual income
- Social category
- Disability status
- Rural residence
- State
- District
- Business or activity information

The backend evaluates the submitted details against the available scheme catalogue and returns relevant matches.

---

### 📋 Scheme Information

Users can view useful information about recommended schemes, including:

- Eligibility details
- Benefits
- Required documents
- Reason for recommendation
- Official references
- Application-related information

The platform is designed to simplify scheme discovery while keeping official sources available for final verification.

---

### 🔐 Secure Authentication

SchemeSaathi includes a complete authentication and account-recovery flow.

Features include:

- User registration
- Secure password hashing
- Login
- JWT-based authentication
- Email OTP verification
- Forgot-password verification
- Password reset
- Protected user routes

Email OTP delivery is handled using **Brevo**.

**No SMS-based authentication is required.**

---

### 💬 Scheme Assistant

The Scheme Assistant helps users understand available scheme information and navigate the platform.

It can assist with queries related to:

- Eligibility
- Scheme benefits
- Required documents
- Application guidance
- Scheme comparison
- Profile-based recommendations
- Website navigation
- Account and support guidance

Responses are based on the scheme catalogue and backend retrieval system.

---

### 🎙️ Multilingual Voice Assistance

SchemeSaathi includes a multilingual voice-assistance interface.

Users can interact using speech, and the configured language services support:

- Speech input
- Language processing
- Scheme-related responses
- Audio output

---

### 🗺️ State & District Selection

The platform provides structured state and district selection for accurate location-based information.

Changing the selected state automatically updates the available district options.

---

### 👤 User Profile

Registered users can manage their profile and use their saved information while accessing platform features.

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

**Customer Care Email:**  
customercareprashasti@gmail.com

---

# 🛠️ Technology Stack

## Frontend

- React
- Vite
- JavaScript
- HTML
- CSS

## Backend

- Python
- FastAPI
- REST APIs

## Database

- PostgreSQL for production
- SQLite for local development

## Authentication

- JWT authentication
- Secure password hashing
- Email OTP verification
- Brevo transactional email service

## Development & Deployment

- Git
- GitHub
- Docker
- Render
- VS Code

---

# ⚙️ How SchemeSaathi Works

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
View Matching Reasons
          ↓
Check Benefits & Required Documents
          ↓
Visit Official Source for Further Action or authentication checks do not prove inbox/SMS delivery.
