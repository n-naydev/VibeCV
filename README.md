# VibeCV

**VibeCV** is a Chrome extension designed to help you tailor your CV for specific job applications.

## Features

- **CV Customization**: Automatically adjusts your CV content based on job descriptions.
- **PDF Extraction**: Extracts text from your local PDF resume.
- **LinkedIn Integration**: Works with LinkedIn to help autofill or analyze job posts (based on permissions).

## Installation

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:n-naydev/VibeCV.git
    ```
2.  **Open Chrome Extensions:**
    - Navigate to `chrome://extensions/` in your browser.
    - Toggle **Developer mode** in the top right corner.
3.  **Load the extension:**
    - Click **Load unpacked**.
    - Select the directory where you cloned this repository (the folder containing `manifest.json`).

## Usage

1.  Click the **VibeCV** icon in your browser toolbar.
2.  Upload your base CV/Resume (PDF support included).
3.  Navigate to a job posting or input the job description.
4.  Let VibeCV suggest tailored content for your application.

## Development

- **`manifest.json`**: Configuration file for the Chrome extension.
- **`background.js`**: Service worker for background tasks.
- **`contentScript.js`**: Script that interacts with web pages.
- **`popup.html` / `popup.js`**: The extension's UI.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
