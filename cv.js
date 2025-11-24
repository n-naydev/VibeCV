function escapeHtml(str = "") {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

chrome.storage.local.get("cvData", ({ cvData }) => {
  if (!cvData) {
    console.error("No cvData found in storage");
    return;
  }

  const {
    personal = {},
    summary = [],
    skills = [],
    experience = [],
    education = [],
    job_target = {},
  } = cvData;

  // Header
  document.getElementById("cv-name").textContent = personal.name || "";
  document.getElementById("cv-title-location").textContent = [
    personal.title,
    personal.location,
  ]
    .filter(Boolean)
    .join(" · ");

  document.getElementById("cv-contact").textContent = [
    personal.email,
    personal.phone,
  ]
    .filter(Boolean)
    .join(" · ");

  // Summary
  const summaryEl = document.getElementById("cv-summary");
  const summaryArr = Array.isArray(summary) ? summary : [summary];
  summaryEl.innerHTML = summaryArr
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

  // Skills
  const skillsEl = document.getElementById("cv-skills");
  skillsEl.innerHTML = (skills || [])
    .map((s) => `<span class="badge">${escapeHtml(s)}</span>`)
    .join("");

  // Experience
  const expEl = document.getElementById("cv-experience");
  expEl.innerHTML = (experience || [])
    .map((exp) => {
      const header = [
        exp.role,
        exp.company,
        exp.location,
        [exp.start, exp.end].filter(Boolean).join(" – "),
      ]
        .filter(Boolean)
        .join(" · ");

      const bullets = (exp.bullets || [])
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join("");

      return `
        <div class="exp-item" style="margin-bottom:12px;">
          <div><strong>${escapeHtml(header)}</strong></div>
          <ul>${bullets}</ul>
        </div>
      `;
    })
    .join("");

  // Education
  const eduEl = document.getElementById("cv-education");
  eduEl.innerHTML = (education || [])
    .map((e) => {
      const header = [
        e.degree,
        e.institution,
        [e.start, e.end].filter(Boolean).join(" – "),
      ]
        .filter(Boolean)
        .join(" · ");

      return `<div style="margin-bottom:6px;">${escapeHtml(header)}</div>`;
    })
    .join("");

  // Auto-print so user can save as PDF
  setTimeout(() => {
    window.print();
  }, 500);
});
