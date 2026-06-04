<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 🚀 Running Locally

Follow these steps to set up and run the Discourse Analyzer AI application in your local development environment.

### 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
* **Node.js** (v18.x or higher recommended)
* **MongoDB** (v5.x or higher, running locally or accessible via a remote connection string)
* **Redis** (Optional, for caching and session store. If omitted, the app falls back to MongoDB/Memory store)
  
  **Docker Command Used:**
  If you need to recreate the Redis container in the future, use the following command:
  ```bash
  docker run -d --name redis-local -p 6379:6379 --restart unless-stopped redis redis-server --requirepass "RedisLocal123!"
  ```
  Corresponding connection string for [server/.env](file:///c:/dev/apps/discourse-analyzer-ai/server/.env):
  ```env
  REDIS_URL="redis://:RedisLocal123!@127.0.0.1:6379"
  ```

---

### ⚙️ Environment Setup

You need to configure environment variables for both the frontend (root directory) and the backend ([server](file:///c:/dev/apps/discourse-analyzer-ai/server) directory).

#### 1. Frontend Configuration (Root)

Copy the frontend environment template [.env.example](file:///c:/dev/apps/discourse-analyzer-ai/.env.example) and configure the variables:
```bash
cp .env.example .env
```
Inside the new [.env](file:///c:/dev/apps/discourse-analyzer-ai/.env) file:
* `VITE_API_URL`: Set to `http://localhost:3001/api` (the URL where Vite proxies backend requests).
* `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (for Google Sign-In).
* `VITE_TURNSTILE_SITE_KEY`: (Optional) Your Cloudflare Turnstile site key if CAPTCHA is enabled.

#### 2. Backend Configuration (Server)

Navigate to the `server` directory, copy the environment template [server/.env.example](file:///c:/dev/apps/discourse-analyzer-ai/server/.env.example), and configure the variables:
```bash
cd server
cp .env.example .env
```
Inside the new [server/.env](file:///c:/dev/apps/discourse-analyzer-ai/server/.env) file:
* `NODE_ENV`: Set to `local`.
* `BYPASS_AUTH`: Set to `true` (highly recommended for local development to bypass Google OAuth checks).
* `MONGODB_URI`: Connection string to your local or remote MongoDB instance (e.g., `mongodb://127.0.0.1:27017/discourse-analyzer-dev`).
* `REDIS_URL`: (Optional) Connection string to your Redis instance (e.g., `redis://:RedisLocal123!@127.0.0.1:6379`). Leave commented out to disable Redis features.
* `SESSION_SECRET`: A secure random string to sign cookies.
* `API_KEYS_SECRET`: A secure random string for encrypting API keys.
* `GEMINI_API_KEY`: Your Google Gemini API key.
* `GROK_API_KEY`: (Optional) Your xAI Grok API key.
* `CHATGPT_API_KEY`: (Optional) Your OpenAI ChatGPT API key.

---

### 💻 Step-by-Step Execution

#### 1. Install Dependencies

Install dependencies for both frontend and backend:
```bash
# Install frontend dependencies (at root)
npm install

# Install backend dependencies
cd server
npm install
```

#### 2. Run Database Migrations

Apply database schema migrations to MongoDB:
```bash
# From the root directory:
npm run migrate:deploy
```
> [!NOTE]
> This command automatically runs database migrations using `migrate-mongo up` in the backend.

#### 3. Start Development Servers

You must start both the frontend and backend servers. We recommend running them in separate terminal windows or tabs to view logs easily:

* **Start Frontend (Port 3000)**:
  ```bash
  # From the root directory:
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

* **Start Backend (Port 3001)**:
  ```bash
  # From the root directory:
  cd server
  npm run start
  ```
  The backend runs on [http://localhost:3001](http://localhost:3001).

---

### 🧪 Running Tests

* **Frontend Tests Only**:
  ```bash
  npm run test:frontend
  ```
* **Backend Tests Only**:
  ```bash
  npm run test:server
  ```
* **All Tests**:
  ```bash
  npm run test
  ```

---

### 📦 Build for Production

To build the client-side bundle for production:
```bash
npm run build
```
This runs migrations, compiles Vite assets, and packages files into the [dist](file:///c:/dev/apps/discourse-analyzer-ai/dist) directory.

