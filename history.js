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
        title.textContent = item.jobTitle || 'Unknown Title';

        const company = document.createElement('div');
        company.className = 'cv-company';
        company.textContent = item.company || 'Unknown Company';

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