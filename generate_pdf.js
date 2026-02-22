document.addEventListener("cv-rendered", async () => {
  const element = document.getElementById('pdf-content');
  const opt = {
    margin:       20, // 20mm matches css
    filename:     'cv.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const pdfDataUri = await html2pdf().from(element).set(opt).output('datauristring');
    // Send it back to the background script
    chrome.runtime.sendMessage({
      type: 'PDF_GENERATED',
      dataUri: pdfDataUri
    });
  } catch (err) {
    chrome.runtime.sendMessage({
      type: 'PDF_GENERATION_ERROR',
      error: err.message
    });
  }
});