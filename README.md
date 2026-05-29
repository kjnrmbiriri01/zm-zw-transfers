Currency Exchange & Transfer Tool (ZW ↔ ZM)
This project is a web-based currency calculator designed to help users calculate exchange rates between Zambian Kwacha (ZK) and USD/Zimbabwean markets.

🚀 Features
Real-time Calculations: Converts amounts based on current rates.

Telegram Integration: Fetches live data via a Telegram Bot API.

Responsive Design: Works on mobile and desktop devices.

Secure Architecture: Uses Netlify Functions to process backend requests.

🛠️ Tech Stack
Frontend: HTML5, CSS3, JavaScript.

Backend: Netlify Functions (Node.js).

API: Telegram Bot API (node-fetch).

Hosting: Netlify.

📂 Project Structure
Plaintext
/
├── index.html          # Main application UI and logic
├── netlify.toml        # Netlify configuration for functions
├── package.json        # Dependencies (node-fetch)
├── package-lock.json   # Dependency lockfile
├── netlify/
│   └── functions/
│       └── get_rate.js # Backend function to hide API token
└── favicon.png         # Website tab icon
⚙️ Setup & Deployment
Environment Variables: Ensure the BOT_TOKEN is set in your Netlify Dashboard under Site configuration > Build & deploy > Environment.

Deployment: This project is designed for Netlify. Ensure the netlify/functions directory is included in your deployment.

Favicon: The tab icon is linked in the <head> section of index.html.

🔒 Security Notice
This project uses an API token to communicate with the Telegram Bot. Please ensure this token is never hardcoded in your public files. It should always be handled via Environment Variables in your hosting provider's settings.

How to use this:
Open your project folder on your computer.

Create a new file named README.md.

Paste the text above into it.

Save the file.

Now, whenever you look at this folder months from now, you’ll have a clear guide on how your project is built and how to manage the security settings!
