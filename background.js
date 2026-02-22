importScripts("common.js");

function getTailorPromptTemplate() {
  return new Promise((resolve) => {
    chrome.storage.local.get("tailorPrompt", ({ tailorPrompt }) => {
      const tpl =
        (tailorPrompt && tailorPrompt.trim()) || DEFAULT_TAILOR_PROMPT;
      resolve(tpl);
    });
  });
}

function withAPIConfig(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      chrome.storage.local.get(["provider", "apiKey", "model"], (data) => {
        const provider = data.provider || "openai";
        const apiKey = data.apiKey;
        const model = data.model || "gpt-4.1-mini";

        if (!apiKey) {
          return reject(
            new Error(
              "No API key set. Please configure it in the extension options."
            )
          );
        }

        fn(provider, apiKey, model, ...args)
          .then(resolve)
          .catch(reject);
      });
    });
}

const tailorCvForJob = withAPIConfig(
  async (provider, apiKey, model, jobData, baseCV) => {
    const template = await getTailorPromptTemplate();

    const prompt = template
      .replace(/{{BASE_CV}}/g, baseCV || "")
      .replace(/{{JOB_TITLE}}/g, jobData.title || "")
      .replace(/{{JOB_COMPANY}}/g, jobData.company || "")
      .replace(/{{JOB_LOCATION}}/g, jobData.location || "")
      .replace(/{{JOB_DESCRIPTION}}/g, jobData.description || "");

    const text = await getLLMResponse(
      provider,
      model,
      apiKey,
      prompt,
      "You are a helpful assistant that rewrites CVs in structured JSON."
    );
    let parsed;
    try {
      parsed = cleanAndParseJson(
        Array.isArray(text) ? text[0]?.text ?? "" : text
      );
    } catch (e) {
      throw new Error("Model did not return valid JSON");
    }

    return parsed;
  }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAILOR_CV_SCRAPING_DONE") {
    const jobData = message.data;

    chrome.storage.local.get("baseCV", ({ baseCV }) => {
      if (!baseCV) {
        sendResponse?.({ error: "No base CV set (text extracted from PDF)." });
        return;
      }

      tailorCvForJob(jobData, baseCV)
        .then((cvData) => {
          chrome.storage.local.get({ cvHistory: [] }, (res) => {
            const history = res.cvHistory;
            const newEntry = {
              id: Date.now().toString(),
              url: jobData.url || "",
              jobTitle: jobData.jobTitle || "Unknown Title",
              company: jobData.company || "Unknown Company",
              cvData: cvData,
              date: new Date().toISOString()
            };
            history.push(newEntry);

            chrome.storage.local.set({ cvData, cvHistory: history }, () => {
              chrome.runtime.sendMessage({
                type: "TAILOR_CV_DONE",
              });
              chrome.tabs.create({
                url: chrome.runtime.getURL("cv.html"),
              });
              sendResponse?.({ ok: true });
            });
          });
        })
        .catch((err) => {
          console.error(err);
          sendResponse?.({ error: err.message });
        });
    });

    // Keep the message channel open for the async sendResponse
    return true;
  }
});

// --- PDF Generation logic ---
let pdfResolve = null;

async function setupOffscreenDocument(path) {
  // Check if offscreen exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
  
  await chrome.offscreen.createDocument({
    url: path,
    reasons: ['DOM_PARSER'],
    justification: 'Generate PDF using DOM parsing and html2pdf'
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_PDF') {
    setupOffscreenDocument(`generate_pdf.html?id=${message.cvId}`)
      .then(() => {
        pdfResolve = sendResponse;
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });
    return true; // keep channel open
  }

  if (message.type === 'PDF_GENERATED') {
    if (pdfResolve) {
      pdfResolve({ dataUri: message.dataUri });
      pdfResolve = null;
    }
    chrome.offscreen.closeDocument().catch(()=>{});
  }

  if (message.type === 'PDF_GENERATION_ERROR') {
    if (pdfResolve) {
      pdfResolve({ error: message.error });
      pdfResolve = null;
    }
    chrome.offscreen.closeDocument().catch(()=>{});
  }
});
