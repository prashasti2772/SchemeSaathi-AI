// Shared questionnaire contract for matching and the assistant. Unanswered
// questions stay unknown; saved business answers require an explicit opt-in.
export function buildCitizenProfile(personal = {}, business = {}, other = {}) {
  personal ||= {};
  business ||= {};
  other ||= {};
  const entrepreneurship = personal.entrepreneurshipSupport === "Yes" ? true
    : personal.entrepreneurshipSupport === "No" ? false : null;
  const businessAnswer = key => entrepreneurship === true ? business[key] || null : null;
  return {
    phone_number: personal.phoneNumber || null,
    full_name: personal.fullName || null,
    age: personal.age !== "" && personal.age != null ? Number(personal.age) : null,
    gender: personal.gender || null,
    state: personal.state || null,
    district: personal.district || null,
    disability: personal.disability === "Yes" ? true : personal.disability === "No" ? false : null,
    rural: personal.residence === "Rural" ? true : personal.residence === "Urban" ? false : null,
    social_category: personal.category || null,
    education: personal.education || null,
    occupation: personal.occupation || null,
    interests: personal.interests || null,
    welfare_needs: personal.welfareNeeds || null,
    entrepreneurship_support: entrepreneurship,
    business_type: businessAnswer("businessType"),
    business_activity: businessAnswer("businessActivity"),
    business_stage: businessAnswer("businessStage"),
    years_in_business: businessAnswer("yearsInBusiness"),
    annual_turnover: businessAnswer("annualTurnover"),
    number_of_employees: businessAnswer("numberOfEmployees"),
    annual_income: other.annualIncome ?? null,
    registered_business: entrepreneurship === true ? other.registeredBusiness || null : null,
    funding_required: entrepreneurship === true ? other.fundingRequired || null : null,
    preferred_support: other.preferredSupport || null,
    interested_scheme_type: other.interestedSchemeType || null,
  };
}

export function officialSchemeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    // Government guidance explicitly links NSSH's implementing portal.
    const approvedApplicationHost = ["scsthub.in", "www.scsthub.in"].includes(host);
    const officialHost = host.endsWith(".gov.in") || host.endsWith(".nic.in") || approvedApplicationHost;
    return url.protocol === "https:" && officialHost && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
