function scrapeJobData() {
  // 1. Check the current hostname for LinkedIn
  const isLinkedIn = window.location.hostname.includes("linkedin.com");

  if (isLinkedIn) {
    const jobTitle =
      document.querySelector(".job-details-jobs-unified-top-card__job-title")
        ?.innerText || "";

    const company =
      document.querySelector(".job-details-jobs-unified-top-card__company-name")
        ?.innerText || "";
    const description =
      document.querySelector(".jobs-description-content")?.innerText || "";

    return { jobTitle, company, location, description };
  } else {
    // --- GENERIC READABILITY LOGIC (For all other sites) ---

    // 1. Clone the current document
    const documentClone = document.cloneNode(true);

    // 2. Run Readability
    const article = new Readability(documentClone).parse();

    if (article) {
      // Readability success: get the cleanest text string
      description = article.textContent;
    } else {
      // Readability failure: use the safer, non-body fallback
      const safeFallback =
        document.querySelector('main, article, [role="main"]') || document.body;
      description = safeFallback.innerText;
      console.warn("Readability failed. Using semantic element fallback.");
    }
    return { description };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAILOR_CV_START") {
    const jobData = scrapeJobData();

    chrome.runtime.sendMessage({
      type: "TAILOR_CV_SCRAPING_DONE",
      data: jobData,
    });
  }
});
