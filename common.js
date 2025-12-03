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

/**
 * Sends a prompt to the specified LLM provider and returns the response text.
 * @param {string} provider - 'openai', 'gemini', or 'anthropic'.
 * @param {string} model - The specific model name (e.g., 'gpt-4o', 'gemini-2.5-flash').
 * @param {string} apiKey - The API key for the selected provider.
 * @param {string} jobText - The job ad text to be analyzed.
 * @param {string} systemInstruction - The instruction for the model (e.g., "Extract key skills").
 * @returns {Promise<string>} The generated text response.
 */
async function getLLMResponse(
  provider,
  model,
  apiKey,
  prompt,
  systemInstruction
) {
  let url = "";
  let headers = { "Content-Type": "application/json" };
  let body = {};

  switch (provider.toLowerCase()) {
    case "openai":
      url = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;

      body = {
        model: model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        // max_tokens: 1024,
        temperature: 0.1,
      };
      break;

    case "gemini":
      // Note: The model name is included directly in the URL path for Gemini REST API
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      headers["x-goog-api-key"] = apiKey;

      body = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `System Instruction: ${systemInstruction}\n\n${prompt}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      };
      break;

    case "anthropic":
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      // Anthropic requires a specific header for versioning
      headers["anthropic-version"] = "2023-06-01";

      body = {
        model: model,
        messages: [{ role: "user", content: prompt }],
        system: systemInstruction, // System instruction is a top-level field
        max_tokens: 1024,
        temperature: 0.1,
      };
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API Error from ${provider}: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await response.json();

    // **Response Parsing (Extraction)**
    if (provider === "openai") {
      return data.choices[0].message.content.trim();
    } else if (provider === "gemini") {
      // Gemini response structure is nested deeper
      return data.candidates[0].content.parts[0].text.trim();
    } else if (provider === "anthropic") {
      // Anthropic content is an array of text objects
      return data.content[0].text.trim();
    }
  } catch (error) {
    console.error("LLM Request Failed:", error);
    return `Error: Failed to process request for ${provider}. Details: ${error.message}`;
  }
}
