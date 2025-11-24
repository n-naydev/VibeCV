const PROFILE_DATA = {
  firstName: "John",
  lastName: "Doe",
  fullName: "John Doe",
  email: "john.doe@example.com",
  phone: "+49 123 4567890",
  city: "Berlin",
  postalCode: "10115",
  country: "Germany",
  headline: "Senior Software Engineer",
  currentCompany: "My Current Company",
};

function setInputValue(input, value) {
  if (!input) return;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  nativeInputValueSetter.call(input, value);

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillLinkedInForm() {
  const nameInputs = document.querySelectorAll(
    'input[name*="fullName"], input[id*="fullName"]'
  );
  nameInputs.forEach((el) => setInputValue(el, PROFILE_DATA.fullName));

  const firstNameInput = document.querySelector(
    'input[name*="firstName"], input[id*="firstName"]'
  );
  const lastNameInput = document.querySelector(
    'input[name*="lastName"], input[id*="lastName"]'
  );
  setInputValue(firstNameInput, PROFILE_DATA.firstName);
  setInputValue(lastNameInput, PROFILE_DATA.lastName);

  const emailInput = document.querySelector(
    'input[type="email"], input[name*="email"], input[id*="email"]'
  );
  setInputValue(emailInput, PROFILE_DATA.email);

  const phoneInput = document.querySelector(
    'input[type="tel"], input[name*="phone"], input[id*="phone"]'
  );
  setInputValue(phoneInput, PROFILE_DATA.phone);

  const cityInput = document.querySelector(
    'input[name*="city"], input[id*="city"]'
  );
  setInputValue(cityInput, PROFILE_DATA.city);

  const postalCodeInput = document.querySelector(
    'input[name*="postalCode"], input[id*="postalCode"], input[name*="zip"]'
  );
  setInputValue(postalCodeInput, PROFILE_DATA.postalCode);

  const headline = document.querySelector(
    'textarea[name*="headline"], textarea[id*="headline"]'
  );
  if (headline) {
    headline.value = PROFILE_DATA.headline;
    headline.dispatchEvent(new Event("input", { bubbles: true }));
    headline.dispatchEvent(new Event("change", { bubbles: true }));
  }

  console.log("LinkedIn Autofill: Attempted to fill fields.");
}
function scrapeJobData() {
  const jobTitle =
    document.querySelector(".job-details-jobs-unified-top-card__job-title")
      ?.innerText || "";

  const company =
    document.querySelector(".job-details-jobs-unified-top-card__company-name")
      ?.innerText || "";
  const description =
    document.querySelector(".jobs-description-content")?.innerText || "";

  return { jobTitle, company, location, description };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTOFILL_LINKEDIN") {
    fillLinkedInForm();
  } else if (message.type === "SCRAPING_START") {
    const jobData = scrapeJobData();

    chrome.runtime.sendMessage({ type: "SCRAPING_DONE", data: jobData });
  } else if (message.type === "GET_KEYWORDS_START") {
    const jobData = scrapeJobData();

    chrome.runtime.sendMessage({
      type: "GET_KEYWORDS_SCRAPING_DONE",
      data: jobData,
    });
  } else if (message.type === "TAILOR_CV_START") {
    const jobData = scrapeJobData();

    chrome.runtime.sendMessage({
      type: "TAILOR_CV_SCRAPING_DONE",
      data: jobData,
    });
  }
});
