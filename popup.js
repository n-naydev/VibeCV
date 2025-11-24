document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("scrape").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "SCRAPING_START" });
  });
});

document.getElementById("get-keywords").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "GET_KEYWORDS_START" });
  });
});

document.getElementById("tailor-cv").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(222, tabs);
    chrome.tabs.sendMessage(tabs[0].id, { type: "TAILOR_CV_START" });
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SCRAPING_DONE") {
    const textarea = document.getElementById("jobInfo");
    const data = message.data;
    textarea.value = `Job Info:\n${data.jobTitle}\n---\n${data.company}\n---\n${data.description}`;
    textarea.style.visibility = "visible";
    textarea.rows = 10;
    textarea.cols = 30;
  }
});
