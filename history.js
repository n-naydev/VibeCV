document.addEventListener('DOMContentLoaded', () => {
  const historyList = document.getElementById('history-list');

  function renderHistory() {
    chrome.storage.local.get({ cvHistory: [] }, (res) => {
      let history = res.cvHistory;
      historyList.innerHTML = '';

      if (!history || history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No saved CVs yet.</div>';
        return;
      }

      // Sort by newest first
      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      history.forEach((item, index) => {
        const dateStr = new Date(item.date).toLocaleString();
        
        const card = document.createElement('div');
        card.className = 'cv-card';

        const info = document.createElement('div');
        info.className = 'cv-info';

        const title = document.createElement('div');
        title.className = 'cv-title';
        
        const titleText = document.createElement('span');
        titleText.textContent = item.jobTitle || 'Unknown Title';

        const editTitleBtn = document.createElement('span');
        editTitleBtn.innerHTML = ' ✎';
        editTitleBtn.style.cssText = 'cursor:pointer; opacity: 0.6; font-size: 0.8em; margin-left: 6px; font-weight: normal;';
        editTitleBtn.title = "Edit Job Title";
        editTitleBtn.onmouseover = () => editTitleBtn.style.opacity = '1';
        editTitleBtn.onmouseout = () => editTitleBtn.style.opacity = '0.6';

        editTitleBtn.onclick = () => {
          const newTitle = prompt("Edit Job Title:", item.jobTitle || 'Unknown Title');
          if (newTitle !== null && newTitle.trim() !== "") {
            const trueIndex = res.cvHistory.findIndex(h => h.id === item.id);
            if(trueIndex !== -1) {
              res.cvHistory[trueIndex].jobTitle = newTitle.trim();
              chrome.storage.local.set({ cvHistory: res.cvHistory }, () => {
                renderHistory();
              });
            }
          }
        };

        title.append(titleText, editTitleBtn);

        const company = document.createElement('div');
        company.className = 'cv-company';
        
        const companyText = document.createElement('span');
        companyText.textContent = item.company || 'Unknown Company';
        
        const editCompanyBtn = document.createElement('span');
        editCompanyBtn.innerHTML = ' ✎';
        editCompanyBtn.style.cssText = 'cursor:pointer; opacity: 0.6; font-size: 0.9em; margin-left: 4px;';
        editCompanyBtn.title = "Edit Company Name";
        editCompanyBtn.onmouseover = () => editCompanyBtn.style.opacity = '1';
        editCompanyBtn.onmouseout = () => editCompanyBtn.style.opacity = '0.6';
        
        editCompanyBtn.onclick = () => {
          const newCompany = prompt("Edit Company Name:", item.company || 'Unknown Company');
          if (newCompany !== null && newCompany.trim() !== "") {
            const trueIndex = res.cvHistory.findIndex(h => h.id === item.id);
            if(trueIndex !== -1) {
              res.cvHistory[trueIndex].company = newCompany.trim();
              chrome.storage.local.set({ cvHistory: res.cvHistory }, () => {
                renderHistory(); // Re-render to show updated name
              });
            }
          }
        };

        company.append(companyText, editCompanyBtn);

        const meta = document.createElement('div');
        meta.className = 'cv-meta';
        const urlLink = item.url ? `<a href="${item.url}" target="_blank">Job Link</a> • ` : '';
        meta.innerHTML = `${urlLink}${dateStr}`;

        info.append(title, company, meta);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => {
          chrome.tabs.create({ url: chrome.runtime.getURL(`cv.html?id=${item.id}`) });
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
          if (confirm('Delete this saved CV?')) {
            // Find the true index in case the array was sorted differently than the original
            const trueIndex = res.cvHistory.findIndex(h => h.id === item.id);
            if(trueIndex !== -1) {
              res.cvHistory.splice(trueIndex, 1);
              chrome.storage.local.set({ cvHistory: res.cvHistory }, () => {
                renderHistory();
              });
            }
          }
        };

        actions.append(viewBtn, deleteBtn);
        card.append(info, actions);
        historyList.appendChild(card);
      });
    });
  }

  renderHistory();
});