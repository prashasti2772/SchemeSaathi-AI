import SavedSchemeProfile from "./components/findSchemes/SavedSchemeProfile";
import React, { useEffect, useState } from "react";

import { HomePage } from "./components/home";

import {
  SignInPage,
  SignUpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from "./components/auth";

import {
  PersonalInfoPage,
  BusinessDetailsPage,
  OtherDetailsPage,
  ReviewPage,
  MatchingSchemesPage,
  AIAssistantPage
} from "./components/findSchemes";

import AboutPage from "./components/about/AboutPage";

import CategoriesPage from "./components/categories/CategoriesPage";

import ResourcesPage from "./components/resources/ResourcesPage";

import ProfilePage from "./components/profile/ProfilePage";
import SavedSchemesPage from "./components/schemes/SavedSchemesPage";


import SupportPage from "./components/SupportPage";
import AdminSupportPage from "./components/AdminSupportPage";

function getPath() {
  const path = window.location.pathname.replace(/\/+$/, "");

  return path || "/";
}


export default function App() {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const handlePopState = () => {
      setPath(getPath());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);

  if (path === "/support") return <SupportPage />;
  if (path === "/admin/support") return <AdminSupportPage />;

  // Home
  if (path === "/") {
    return <HomePage />;
  }

  // Sign In
  if (path === "/signin") {
    return <SignInPage />;
  }

  // Sign Up
  if (path === "/signup") {
    return <SignUpPage />;
  }

  if (path === "/forgot-password") {
    return <ForgotPasswordPage />;
  }

  if (path === "/reset-password") {
    return <ResetPasswordPage />;
  }

  if (
    path === "/find-schemes" ||
    path === "/find-schemes/personal-info"
  ) {
    return <SavedSchemeProfile><PersonalInfoPage /></SavedSchemeProfile>;
  }

  if (path === "/find-schemes/business-details") {
    return <SavedSchemeProfile><BusinessDetailsPage /></SavedSchemeProfile>;
  }

  if (path === "/find-schemes/other-details") {
    return <SavedSchemeProfile><OtherDetailsPage /></SavedSchemeProfile>;
  }

  if (path === "/find-schemes/review") {
    return <SavedSchemeProfile><ReviewPage /></SavedSchemeProfile>;
  }

  if (
    path === "/find-schemes/matching-schemes" ||
    path === "/find-schemes/results"
  ) {
    return <SavedSchemeProfile><MatchingSchemesPage /></SavedSchemeProfile>;
  }

    if (path === "/about") {
  return <AboutPage />;
}

if (path === "/categories" || path === "/search") {
  return <CategoriesPage />;
}

if (path === "/resources") {
  return <ResourcesPage />;
}

if (path === "/ai-assistant") {
  return <AIAssistantPage />;
}

if (path === "/voice-assistant") {
  return <AIAssistantPage />;
}

if (path === "/profile") {
  return <ProfilePage />;
}
if (path === "/saved-schemes") return <SavedSchemesPage />;

  return <HomePage />;
}
