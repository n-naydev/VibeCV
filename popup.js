const tailorBtn = document.getElementById("tailor-cv");
const openOptionsBtn = document.getElementById("open-options");
const stageStatusEl = document.getElementById("stage-status");

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TAILOR_CV_SCRAPING_DONE") {
    setStage("generate");
  } else if (message.type === "TAILOR_CV_DONE") {
    setStage("done");
  }
});

const stepEls = {
  scrape: document.querySelector('.step[data-step="scrape"]'),
  request: document.querySelector('.step[data-step="request"]'),
  generate: document.querySelector('.step[data-step="generate"]'),
};

function resetSteps() {
  Object.values(stepEls).forEach((el) => {
    el.classList.remove("active", "done", "error");
  });
}

function setStage(stage) {
  resetSteps();

  if (stage === "idle") {
    stageStatusEl.textContent =
      "Ready. Open a job page and click “Tailor CV for this job”.";
    return;
  }

  if (stage === "scrape") {
    stepEls.scrape.classList.add("active");
    stageStatusEl.textContent = "Scraping job description from this page...";
  } else if (stage === "request") {
    stepEls.scrape.classList.add("done");
    stepEls.request.classList.add("active");
    stageStatusEl.textContent = "Sending CV + job description to OpenAI...";
  } else if (stage === "generate") {
    stepEls.scrape.classList.add("done");
    stepEls.request.classList.add("done");
    stepEls.generate.classList.add("active");
    stageStatusEl.textContent = "Generating tailored CV PDF...";
  } else if (stage === "done") {
    Object.values(stepEls).forEach((el) => el.classList.add("done"));
    stageStatusEl.textContent =
      "Done! A new tab with your tailored CV should be open.";
  } else if (stage === "error") {
    stepEls.scrape.classList.add("error");
    stepEls.request.classList.add("error");
    stepEls.generate.classList.add("error");
    stageStatusEl.textContent =
      "Something went wrong while generating your CV. Check the console/logs.";
  }
}

// initial
setStage("idle");

// Main button: start flow
tailorBtn.addEventListener("click", async () => {
  setStage("scrape");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      setStage("error");
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, { type: "TAILOR_CV_START" });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      setStage("error");
      return;
    }

    // Ask the content script to scrape the job
    chrome.tabs.sendMessage(tab.id, { type: "TAILOR_CV_START" });
  });
});
