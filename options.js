const apiKeyInput = document.getElementById("api-key");
const modelInput = document.getElementById("model");
const saveApiBtn = document.getElementById("save-api");
const statusEl = document.getElementById("status");
const toggleApiKeyBtn = document.getElementById("toggle-api-key-visibility");

toggleApiKeyBtn.addEventListener("click", () => {
  const isHidden = apiKeyInput.type === "password";
  apiKeyInput.type = isHidden ? "text" : "password";
  toggleApiKeyBtn.textContent = isHidden ? "Hide" : "Show";
});

// Load existing API settings
chrome.storage.local.get(["apiKey", "model"], (data) => {
  if (data.apiKey) apiKeyInput.value = data.apiKey;
  if (data.model) {
    modelInput.value = data.model;
  } else {
    modelInput.value = "gpt-4.1-mini";
  }
});

saveApiBtn.addEventListener("click", () => {
  const apiKey = apiKeyInput.value.trim();
  const model = (modelInput.value || "gpt-4.1-mini").trim();

  chrome.storage.local.set({ apiKey: apiKey, model: model }, () => {
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

// Helper: get OpenAI config from storage
function getOpenAIConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["apiKey", "model"], (data) => {
      const apiKey = data.apiKey;
      const model = data.model || "gpt-4.1-mini";
      if (!apiKey) {
        return reject(new Error("No API key set. Please save it above first."));
      }
      resolve({ apiKey, model });
    });
  });
}

// Upload PDF file to files API
async function uploadCvPdfToOpenAI(file, apiKey) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "assistants"); // or "fine-tune" etc., but "assistants" is typical

  const res = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`File upload failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.id; // file_id
}

// Ask OpenAI to extract text from the uploaded PDF file
async function extractCvTextFromFile(fileId, apiKey, model) {
  const prompt = `
You are a CV text extractor. The user has uploaded a CV as a PDF.

TASK:
- Read the attached file.
- Return the full text content in a clean, plain-text format.
- Preserve the logical structure (section headings, bullet points), but no need for exact layout.
- Output ONLY the plain text, nothing else.
`.trim();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model, // e.g. "gpt-4.1-mini" or "gpt-4.1"
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: fileId, // this is correct for /v1/responses
            },
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI extract error: ${res.status} ${errText}`);
  }

  const data = await res.json();

  // Responses API returns an `output` array
  // Find the first text item in the output
  let text = "";
  const output = data.output || data.response || data; // be defensive

  if (Array.isArray(output)) {
    const firstBlock = output[0];
    const content = firstBlock?.content;
    if (Array.isArray(content)) {
      const textPart = content.find(
        (c) => c.type === "output_text" || c.type === "text"
      );
      text = textPart?.text || "";
    }
  }

  return text;
}

// Handle click: upload + extract + save baseCV
uploadCvBtn.addEventListener("click", async () => {
  if (!selectedCvFile) return;

  cvStatusEl.textContent = "Uploading & extracting...";
  uploadCvBtn.disabled = true;

  try {
    const { apiKey, model } = await getOpenAIConfig();

    // 1) Upload PDF file
    const fileId = await uploadCvPdfToOpenAI(selectedCvFile, apiKey);

    console.log(111, fileId);

    // 2) Ask OpenAI to extract clean text
    const baseCVText = await extractCvTextFromFile(fileId, apiKey, model);

    if (!baseCVText) {
      throw new Error("No text returned from OpenAI.");
    }

    // 3) Save as baseCV in storage
    chrome.storage.local.set({ baseCV: baseCVText }, () => {
      cvStatusEl.textContent = "Extracted & saved!";
      baseCvTextarea.value = baseCVText;

      setTimeout(() => (cvStatusEl.textContent = ""), 2000);
      uploadCvBtn.disabled = false;
    });
  } catch (err) {
    console.error("Error handling CV PDF:", err);
    cvStatusEl.textContent = err.message || "Error extracting CV";
    uploadCvBtn.disabled = false;
  }
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
