function scrapeJobData() {
  const url = window.location.href;
  const isLinkedIn = window.location.hostname.includes("linkedin.com");

  if (isLinkedIn) {
    const jobTitle =
      document.querySelector(".job-details-jobs-unified-top-card__job-title")
        ?.innerText || "";

    const company =
      document.querySelector(".job-details-jobs-unified-top-card__company-name")
        ?.innerText || "";
    
    const location =
      document.querySelector(".job-details-jobs-unified-top-card__bullet")
        ?.innerText || "";
        
    const description =
      document.querySelector(".jobs-description-content")?.innerText || "";

    return { jobTitle, company, location, description, url };
  } else {
    // --- GENERIC READABILITY LOGIC (For all other sites) ---
    let description = "";

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
    return { description, url };
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

// --- File Input Injection Logic ---

function injectVibeCvButtons() {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    if (input.dataset.vibecvInjected) return;
    
    // Most job boards have "resume", "cv", "upload", or "file" in the name/id/class
    const isLikelyResume = /resume|cv|upload|file/i.test(input.name || input.id || input.className);
    if (!isLikelyResume) return;

    input.dataset.vibecvInjected = "true";

    const btn = document.createElement("button");
    btn.textContent = "Choose VibeCV";
    btn.type = "button";
    btn.style.cssText = "margin-left: 8px; padding: 4px 8px; background: #3b82f6; color: white; border: 1px solid #2563eb; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 9999;";
    
    btn.onclick = (e) => {
      e.preventDefault();
      showVibeCvModal(input);
    };

    // Safely insert button
    if (input.parentNode) {
      input.parentNode.insertBefore(btn, input.nextSibling);
    }
  });
}

function showVibeCvModal(targetInput) {
  if (document.getElementById('vibecv-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'vibecv-modal';
  modal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-height: 80vh; overflow-y: auto; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 100000; padding: 16px; font-family: sans-serif; color: #333;";
  
  const header = document.createElement('div');
  header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #ccc; padding-bottom: 8px;";
  header.innerHTML = '<h3 style="margin:0; font-size: 16px; color: #333;">Select a CV</h3><button id="vibecv-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:#333;">&times;</button>';
  
  modal.appendChild(header);

  const listContainer = document.createElement('div');
  listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: #666;">Loading your CVs...</div>';
  modal.appendChild(listContainer);

  const overlay = document.createElement('div');
  overlay.id = 'vibecv-overlay';
  overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 99999;";
  
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  const closeFn = () => {
    modal.remove();
    overlay.remove();
  };
  document.getElementById('vibecv-close').onclick = closeFn;
  overlay.onclick = closeFn;

  // Fetch history
  chrome.storage.local.get({ cvHistory: [] }, (res) => {
    let history = res.cvHistory;
    if (!history || history.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: #666;">No saved CVs found. Generate one first!</div>';
      return;
    }
    
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    listContainer.innerHTML = '';

    history.forEach(item => {
      const card = document.createElement('div');
      card.style.cssText = "padding: 12px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: background 0.2s;";
      card.onmouseover = () => card.style.background = '#f9fafb';
      card.onmouseout = () => card.style.background = 'white';
      
      const title = item.jobTitle || 'Unknown Job';
      const company = item.company || 'Unknown Company';
      
      card.innerHTML = `<div style="font-weight: bold; color: #111;">${title}</div><div style="font-size: 12px; color: #666;">${company}</div>`;
      
      card.onclick = () => {
        card.innerHTML = `<div style="text-align:center; color: #3b82f6; font-size: 12px;">Generating PDF... Please wait.</div>`;
        card.style.pointerEvents = 'none';
        
        try {
          // 1. Create hidden wrapper container
          const container = document.createElement('div');
          container.style.cssText = "position: absolute; left: -9999px; top: 0; width: 800px; background: white; color: black; text-align: left; z-index: -1000;";
          
          // 2. Build the CV HTML using the same structure as cv.html
          const cv = item.cvData;
          const p = cv.personal || {};
          const metaLine1 = [p.title, p.location].filter(Boolean).join(" · ");
          const metaLine2 = [p.email, p.phone].filter(Boolean).join(" · ");
          
          let html = `
            <style>
               .vibe-cv-pdf-wrap { font-family: Arial, sans-serif; background: white; margin: 0; color: #000; box-sizing: border-box; width: 170mm; }
               .vibe-cv-pdf-wrap .cv-container { width: 100%; }
               .vibe-cv-pdf-wrap h1 { margin-bottom: 0; font-size: 24px; color: #000; font-weight: bold; page-break-after: avoid; }
               .vibe-cv-pdf-wrap h2 { margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 4px; font-size: 16px; color: #000; font-weight: bold; page-break-after: avoid; }
               .vibe-cv-pdf-wrap .section { margin-bottom: 16px; page-break-inside: auto; }
               .vibe-cv-pdf-wrap ul { margin: 4px 0 0 18px; padding: 0; }
               .vibe-cv-pdf-wrap li { margin-bottom: 4px; page-break-inside: avoid; }
               .vibe-cv-pdf-wrap p { page-break-inside: avoid; }
               .vibe-cv-pdf-wrap .keywords { page-break-inside: avoid; }
               .vibe-cv-pdf-wrap .keywords span { display: inline-block; margin: 2px 4px 2px 0; border: 1px solid #444; border-radius: 12px; padding: 2px 8px; font-size: 11px; }
               .vibe-cv-pdf-wrap .meta { font-size: 12px; color: #555; page-break-inside: avoid; }
               .vibe-cv-pdf-wrap .exp-item { margin-bottom: 12px; page-break-inside: avoid; }
               .vibe-cv-pdf-wrap .exp-header { font-weight: bold; page-break-after: avoid; }
               .vibe-cv-pdf-wrap .edu-item { margin-bottom: 6px; page-break-inside: avoid; }
            </style>
            <div class="vibe-cv-pdf-wrap" id="vibe-cv-pdf-content">
               <div class="cv-container">
                  <header>
                    <h1>${p.name || ''}</h1>
                    <div class="meta">${metaLine1}</div>
                    <div class="meta">${metaLine2}</div>
                  </header>
          `;

          if (cv.summary) {
             const sumArr = Array.isArray(cv.summary) ? cv.summary : [cv.summary];
             html += `<section class="section"><h2>Summary</h2>`;
             sumArr.filter(Boolean).forEach(s => html += `<p style="margin-bottom:8px;">${s}</p>`);
             html += `</section>`;
          }

          if (cv.skills && cv.skills.length) {
             html += `<section class="section"><h2>Skills</h2><div class="keywords">`;
             cv.skills.forEach(s => html += `<span>${s}</span>`);
             html += `</div></section>`;
          }

          if (cv.experience && cv.experience.length) {
             html += `<section class="section"><h2>Experience</h2>`;
             cv.experience.forEach(exp => {
                const header = [exp.role, exp.company, exp.location, [exp.start, exp.end].filter(Boolean).join(" – ")].filter(Boolean).join(" · ");
                html += `<div class="exp-item"><div class="exp-header">${header}</div><ul>`;
                (exp.bullets || []).forEach(b => html += `<li>${b}</li>`);
                html += `</ul></div>`;
             });
             html += `</section>`;
          }

          if (cv.education && cv.education.length) {
             html += `<section class="section"><h2>Education</h2>`;
             cv.education.forEach(edu => {
                const header = [edu.degree, edu.institution, [edu.start, edu.end].filter(Boolean).join(" – ")].filter(Boolean).join(" · ");
                html += `<div class="edu-item">${header}</div>`;
             });
             html += `</section>`;
          }
          
          html += `</div></div>`;
          container.innerHTML = html;
          document.body.appendChild(container);

          const element = document.getElementById('vibe-cv-pdf-content');
          
          const opt = {
            margin:       [20, 20], // top/bottom, left/right margins (20mm)
            filename:     'CV.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['css', 'legacy'] }
          };

          html2pdf().from(element).set(opt).output('blob').then((blob) => {
              const file = new File([blob], opt.filename, {type: "application/pdf"});
              const dt = new DataTransfer();
              dt.items.add(file);
              targetInput.files = dt.files;
              targetInput.dispatchEvent(new Event('change', { bubbles: true }));
              targetInput.dispatchEvent(new Event('input', { bubbles: true }));
              
              document.body.removeChild(container);
              closeFn();
          }).catch(err => {
              card.innerHTML = `<div style="color: red; font-size: 12px;">Error: ${err.message}</div>`;
              card.style.pointerEvents = 'auto';
              if(document.body.contains(container)) document.body.removeChild(container);
          });
        } catch (err) {
            card.innerHTML = `<div style="color: red; font-size: 12px;">Setup Error: ${err.message}</div>`;
            card.style.pointerEvents = 'auto';
        }
      };
      
      listContainer.appendChild(card);
    });
  });
}

// Observe DOM for dynamically added file inputs (like SPAs)
const observer = new MutationObserver((mutations) => {
  let shouldInject = false;
  for (let m of mutations) {
    if (m.addedNodes.length > 0) {
      shouldInject = true;
      break;
    }
  }
  if (shouldInject) injectVibeCvButtons();
});

// Start observing and initial injection
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
  injectVibeCvButtons();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
    injectVibeCvButtons();
  });
}
