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
        
        // Request PDF generation
        chrome.runtime.sendMessage({ type: 'GENERATE_PDF', cvId: item.id }, (response) => {
          if (response && response.dataUri) {
            // Convert dataURI to File
            const byteString = atob(response.dataUri.split(',')[1]);
            const mimeString = response.dataUri.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], {type: mimeString});
            
            // Clean filename
            const cleanCompany = company.replace(/[^a-zA-Z0-9]/g, '_') || 'Company';
            const file = new File([blob], `CV_${cleanCompany}.pdf`, {type: "application/pdf"});

            // Assign to input
            const dt = new DataTransfer();
            dt.items.add(file);
            targetInput.files = dt.files;
            
            // Dispatch events so React/Vue/Angular on the page notice the change
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));

            closeFn();
          } else {
            card.innerHTML = `<div style="color: red; font-size: 12px;">Error: ${response?.error || 'Unknown error'}</div>`;
            card.style.pointerEvents = 'auto';
          }
        });
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
