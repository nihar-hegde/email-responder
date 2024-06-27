# Email Automation Tool

This tool automates the process of fetching, categorizing, and replying to emails in your Google account. It uses OpenAI to understand the context of the emails, assigns appropriate labels, and sends automated replies. The tool also leverages BullMQ for task scheduling and is built with TypeScript.

## Getting Started

Follow these steps to set up and run the tool locally.

### Prerequisites

- Node.js
- npm
- Google API credentials
- OpenAI API key

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository_url>
   cd <repository_name>
   ```

2. **Environment setup:**

   - Copy the .env.example file to .env and fill in the required values.

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start the application:**

   ```bash
   npm start
   ```

**Authorization**

1. **Google Authentication:**
   - The tool will open a browser window with a Google authorization URL.
   - Log in with your Google account and grant access to the tool.
   - After granting access, you will see a URL similar to this:

```bash
http://localhost:3000/oauth2callback?code=4/0ATx3LY6kzGDkK4UK-3SCRx08JHyTb8zlR6Ib14BxHlNizKUoJa1tOo8A9fOdinBGIZi69A&scope=[https://www.googleapis.com/auth/gmail.modify](https://www.googleapis.com/auth/gmail.modify)

```

2. **Extract the code**
   From the URL, copy the part after code= and before &scope=. For example, from the URL above, you would copy:
   `4/0ATx3LY6kzGDkK4UK-3SCRx08JHyTb8zlR6Ib14BxHlNizKUoJa1tOo8A9fOdinBGIZi69A`

3. **Enter the code in the terminal**
   Paste the code you copied in step 2 into the terminal where it is prompted and press enter.

### Functionality

    Once authenticated, the tool will:

    - Fetch the top 2 unread emails every 4 minutes (currently setup this way to save on OpenAI API costs can be changed).
    - Categorize the emails into different categories.
    - Generate and send replies based on the category and body of the email.
