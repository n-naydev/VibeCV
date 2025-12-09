const apiKeyInput = document.getElementById("api-key");
const providerInput = document.getElementById("provider");
const modelInput = document.getElementById("model");
const saveApiBtn = document.getElementById("save-api");
const statusEl = document.getElementById("status");
const toggleApiKeyBtn = document.getElementById("toggle-api-key-visibility");
// --- Tailoring prompt config ---

const promptTextarea = document.getElementById("prompt-input");
const savePromptBtn = document.getElementById("save-prompt");
const promptStatusEl = document.getElementById("prompt-status");

toggleApiKeyBtn.addEventListener("click", () => {
  const isHidden = apiKeyInput.type === "password";
  apiKeyInput.type = isHidden ? "text" : "password";
  toggleApiKeyBtn.textContent = isHidden ? "Hide" : "Show";
});

// Load existing API settings
chrome.storage.local.get(["provider", "apiKey", "model"], (data) => {
  providerInput.value = data.provider || "openai";
  apiKeyInput.value = data.apiKey || "";
  modelInput.value = data.model || "gpt-4.1-mini";
});

saveApiBtn.addEventListener("click", () => {
  const provider = providerInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const model = (modelInput.value || "gpt-4.1-mini").trim();

  chrome.storage.local.set({ provider, apiKey, model }, () => {
    statusEl.textContent = "Saved!";
    setTimeout(() => (statusEl.textContent = ""), 1500);
  });
});

// --- Base CV (PDF) upload section ---

const cvFileInput = document.getElementById("cv-file");
const uploadCvBtn = document.getElementById("upload-cv");
const cvStatusEl = document.getElementById("cv-status");
// const previewEl = document.getElementById("basecv-input");
const baseCvTextarea = document.getElementById("basecv-input");
const saveBaseCvBtn = document.getElementById("save-basecv-text");

let selectedCvFile = null;

// Enable button when a file is chosen
cvFileInput.addEventListener("change", () => {
  selectedCvFile = cvFileInput.files[0] || null;
  uploadCvBtn.disabled = !selectedCvFile;
});

import * as pdfjsLib from "./libs/pdf.mjs";

// 2. CRITICAL: Configure the worker.
// This tells the library where to find the second file you downloaded.
pdfjsLib.GlobalWorkerOptions.workerSrc = "./libs/pdf.worker.mjs";

async function extractTextFromPdf(file) {
  console.log(`📄 Processing PDF: ${file.name}`);

  // 3. Read the file as an ArrayBuffer (standard browser method)
  const arrayBuffer = await file.arrayBuffer();

  // 4. Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  console.log(`   PDF loaded. Pages: ${pdf.numPages}`);
  let fullText = "";

  // 5. Loop through every page and extract text
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Combine the text items
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }

  return fullText;
}

// Handle click: upload + extract + save baseCV
uploadCvBtn.addEventListener("click", async () => {
  if (!selectedCvFile) return;

  cvStatusEl.textContent = "Uploading & extracting...";
  uploadCvBtn.disabled = true;

  const baseCVText = await extractTextFromPdf(selectedCvFile);
  chrome.storage.local.set({ baseCV: baseCVText }, () => {
    cvStatusEl.textContent = "Extracted & saved!";
    baseCvTextarea.value = baseCVText;

    setTimeout(() => (cvStatusEl.textContent = ""), 2000);
    uploadCvBtn.disabled = false;
  });
});

// Load existing baseCV preview on open (if any)
chrome.storage.local.get("baseCV", ({ baseCV }) => {
  if (baseCV) {
    baseCvTextarea.value = baseCV.slice(0, 5000);
  }
});

saveBaseCvBtn.addEventListener("click", () => {
  const text = (baseCvTextarea.value || "").trim();
  chrome.storage.local.set({ baseCV: text }, () => {
    cvStatusEl.textContent = "Base CV text saved!";
    setTimeout(() => (cvStatusEl.textContent = ""), 2000);
  });
});

// Load existing tailoring prompt (or default)
chrome.storage.local.get("tailorPrompt", ({ tailorPrompt }) => {
  if (promptTextarea) {
    promptTextarea.value =
      (tailorPrompt && tailorPrompt.trim()) || DEFAULT_TAILOR_PROMPT;
  }
});

if (savePromptBtn) {
  savePromptBtn.addEventListener("click", () => {
    const promptText = (promptTextarea.value || "").trim();

    chrome.storage.local.set({ tailorPrompt: promptText }, () => {
      promptStatusEl.textContent = "Prompt saved!";
      setTimeout(() => (promptStatusEl.textContent = ""), 2000);
    });
  });
}
