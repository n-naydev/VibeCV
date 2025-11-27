const DEFAULT_TAILOR_PROMPT = `
You are an expert CV writer.

USER'S BASE CV (to be improved and tailored):
---
{{BASE_CV}}
---

JOB DESCRIPTION:
Title: {{JOB_TITLE}}
Company: {{JOB_COMPANY}}
Location: {{JOB_LOCATION}}
Description:
{{JOB_DESCRIPTION}}

TASK:
Rewrite and improve the user's CV so it is tailored to this specific job, without inventing experience.

OUTPUT:
Return ONLY valid JSON with this structure:

{
  "personal": {
    "name": "string",
    "title": "string",
    "location": "string",
    "email": "string",
    "phone": "string"
  },
  "summary": ["paragraph 1", "paragraph 2"],
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "location": "string",
      "start": "YYYY-MM",
      "end": "YYYY-MM or 'Present'",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "start": "YYYY",
      "end": "YYYY"
    }
  ],
  "job_target": {
    "title": "{{JOB_TITLE}}",
    "company": "{{JOB_COMPANY}}",
    "location": "{{JOB_LOCATION}}"
  }
}
`.trim();

function getTailorPromptTemplate() {
  return new Promise((resolve) => {
    chrome.storage.local.get("tailorPrompt", ({ tailorPrompt }) => {
      const tpl =
        (tailorPrompt && tailorPrompt.trim()) || DEFAULT_TAILOR_PROMPT;
      resolve(tpl);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`000.000 ${message}`);
  if (message.type === "GET_KEYWORDS_SCRAPING_DONE") {
    const jobData = message.data;
    console.log(`000 ${jobData}`);
    callOpenAI(jobData)
      .then((result) => {
        console.log("OpenAI result:", result);
        chrome.storage.local.set({ cvData: result }, () => {
          chrome.tabs.create({
            url: chrome.runtime.getURL("cv.html"),
          });
        });
      })
      .catch((error) => {
        console.error("Error calling OpenAI:", error);
      });

    return true;
  } else if (message.type === "TAILOR_CV_SCRAPING_DONE") {
    console.log(111, message);
    const jobData = message.data;

    chrome.storage.local.get("baseCV", ({ baseCV }) => {
      if (!baseCV) {
        sendResponse?.({ error: "No base CV set (text extracted from PDF)." });
        return;
      }

      tailorCvForJob(jobData, baseCV)
        .then((cvData) => {
          console.log(333, cvData);
          chrome.runtime.sendMessage({
            type: "TAILOR_CV_DONE",
          });
          chrome.storage.local.set({ cvData }, () => {
            chrome.tabs.create({
              url: chrome.runtime.getURL("cv.html"),
            });
          });
          sendResponse?.({ ok: true });
        })
        .catch((err) => {
          console.error(err);
          sendResponse?.({ error: err.message });
        });
    });
  }
});

function withOpenAIConfig(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      chrome.storage.local.get(["apiKey", "model"], (data) => {
        const apiKey = data.apiKey;
        const model = data.model || "gpt-4.1-mini";

        if (!apiKey) {
          return reject(
            new Error(
              "No API key set. Please configure it in the extension options."
            )
          );
        }

        fn(apiKey, model, ...args)
          .then(resolve)
          .catch(reject);
      });
    });
}

const tailorCvForJob = withOpenAIConfig(
  async (apiKey, model, jobData, baseCV) => {
    const template = await getTailorPromptTemplate();

    const prompt = template
      .replace(/{{BASE_CV}}/g, baseCV || "")
      .replace(/{{JOB_TITLE}}/g, jobData.title || "")
      .replace(/{{JOB_COMPANY}}/g, jobData.company || "")
      .replace(/{{JOB_LOCATION}}/g, jobData.location || "")
      .replace(/{{JOB_DESCRIPTION}}/g, jobData.description || "");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that rewrites CVs in structured JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI tailor error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    let parsed;
    try {
      parsed = JSON.parse(Array.isArray(text) ? text[0]?.text ?? "" : text);
    } catch (e) {
      throw new Error("Model did not return valid JSON");
    }

    return parsed;
  }
);
