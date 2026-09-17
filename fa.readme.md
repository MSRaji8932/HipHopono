# AI Web CLI

> یک عامل برنامهنویسی هوش مصنوعی خودمیزبان و مبتنی بر مرورگر — مانند Claude Code، OpenCode CLI، Codex CLI، Zed AI یا Cursor Agent، اما کاملاً از داخل مرورگر و روی سرور خودتان اجرا میشود.

AI Web CLI به شما اجازه میدهد هر پوشه پروژهای را روی سرور خود باز کنید، با یک LLM گفتگو کنید و به عامل اجازه دهید **فایلهای داخل پروژه را بخواند، ویرایش کند، ایجاد کند، تغییر نام دهد و حذف کند** و **دستورات ترمینال را اجرا کند** — همه با تأیید صریح کاربر. بدون وابستگی به فضای ابری. بدون `localStorage`. همه چیز در فایلهای JSON ساده روی دیسک ذخیره میشود.

---

[English Version](readme.md)

## ✨ امکانات

### 🖥️ محیط کار مرورگری
- **ویرایشگر به سبک VSCode** با تبها، برجستهسازی سینتکس، جستجو و جایگزینی، نشانگر ذخیرهنشده، ذخیره خودکار، کشیدن و رها کردن تبها، پیشنمایش مارکداون و ویرایش چندتبی.
- **کاوشگر فایل** با نمایش درختی بارگذاری تنبل، ایجاد فایل/پوشه، تغییر نام، حذف و آگاهی از `.gitignore`.
- **ترمینال یکپارچه** (xterm.js) با پشتیبانی از `cmd`، PowerShell، Git Bash در ویندوز و `bash`/`zsh` در لینوکس/مک. چند ترمینال، stdin/stdout/stderr، فرآیندهای طولانی و قابلیت kill.
- **پنلهای قابل تغییر اندازه** و **نمای تقسیمشده** با رابط کاربری تیره مدرن.
- **پالت دستور**، نوار وضعیت، اعلانها، پنل مشکلات.

### 🤖 عامل هوش مصنوعی
- APIهای قابل تنظیم **سازگار با OpenAI** یا **Anthropic Messages** — بدون ارائهدهنده ثابت.
- **پاسخهای استریم** با قابلیت توقف/تلاش مجدد/ادامه.
- ابزارهای داخلی: `read_file`، `write_file`، `apply_patch`، `create_file`، `delete_file`، `rename_file`، `list_dir`، `glob`، `grep`، `run_command`، `git_status`، `git_diff`، `git_log`، `git_commit`، `git_branch`.
- **حالت تأیید** — هر عمل تغییردهنده با پیشنمایش diff درخواست مجوز میکند.
- لیست سیاه دستورات خطرناک، kill کردن درخت فرآیند پس از timeout، محدودیت ۱ مگابایت برای stdout/stderr.

### 📁 پروژهها و Git
- باز کردن هر پوشهای روی سرور (باید مخزن Git باشد — نیازمند `.git`).
- تشخیص خودکار Git: شاخه فعلی، فایلهای تغییریافته، diffها، تاریخچه کامیت.
- پروژههای اخیر / مورد علاقه / پینشده.
- حالت اختیاری **File System Access API** (با تشخیص ویژگی) برای باز کردن پوشهها از مرورگر.

### 🧠 سیستم مهارتها
- کشف خودکار مهارتها از `.skill/`، `.skills/`، `.opencode/`، `.claude/`، `.codex/`، `.cursor/`، `.zed/`، `.rules/`، `.ai/`، `.agent/`، `.prompts/` — هم **در محدوده پروژه** و هم **در محدوده کاربر** (`~/.claude/skills` و غیره).
- خواندن فایلهای مهارت `.md`، `.json`، `.yaml`، `.txt`؛ تجزیه frontmatter YAML (`name`، `description`، `allowed-tools`).
- ادغام همه مهارتها در یک پرامپت زمان اجرا.
- هر مهارت به عنوان یک **دستور اسلش** (`/my-skill`) و به عنوان یک **ابزار** (`skill__my-skill`) که LLM میتواند فراخوانی کند، ارائه میشود.
- فعال/غیرفعال کردن، اولویتها و بارگذاری مجدد داغ از رابط کاربری.

### 💬 گفتگو و حافظه
- چندین مکالمه، جستجوی مکالمه، چتهای پینشده، تغییر نام، حذف.
- رندر مارکداون، برجستهسازی کد، دکمههای کپی، پیوستها و تصاویر.
- **حافظه پروژه**، **حافظه جهانی**، **حافظه جلسه** و **حافظه پینشده** — همه در سمت سرور در JSON ذخیره میشوند.
- خروجی/ورودی گرفتن مکالمات.

### ⚙️ تنظیمات (`/setting`)
همه چیز از رابط کاربری قابل تنظیم است — هرگز نیاز به ویرایش کد نیست:
- **مدل / ارائهدهنده**: نام مدل، URL API، توکن API، فرمت (openai / anthropic)، temperature، top-p، max tokens، هدرها، timeout، retries.
- **رفتار عامل**: پرامپت سیستمی، ذخیره خودکار، اجرای خودکار، حالت تأیید، حالت خطر، حالت فقطخواندنی.
- **ظاهر**: تم، زبان.
- **ترمینال**: شل، ریشه فضای کاری.
- **سیستم فایل**: پسوندهای مجاز، فایلهای نادیدهگرفتهشده، پوشههای نادیدهگرفتهشده.
- تنظیمات **Git**، **مهارتها** و **حافظه**.
- **حساب کاربری**: تغییر نام کاربری/رمز عبور، خروج، منطقه خطر.

---

## 🧱 پشته فناوری

| لایه | فناوری |
|---|---|
| **بکاند** | Node.js ≥ 20، Express، TypeScript (ESM) |
| **فرانتاند** | React 18، Vite، TypeScript، React Router |
| **استایل** | Tailwind CSS (تم تیره با الهام از ترمینال) |
| **پایگاه داده** | فقط فایلهای JSON — بدون SQL، بدون ORM، بدون Redis |
| **احراز هویت** | کوکیهای HTTP-only + نشستها؛ هش رمز با `scrypt` |
| **استریم** | Server-Sent Events (SSE) — بدون WebSocket |
| **ترمینال** | xterm.js + xterm-addon-fit |
| **مارکداون** | react-markdown + remark-gfm |
| **اعتبارسنجی** | zod |

> **قانون سختگیرانه:** بدون `localStorage`، بدون `sessionStorage`، بدون حالت برنامه در IndexedDB. تمام دادههای پایدار در فایلهای JSON روی سرور زندگی میکنند.

---

## 📂 ساختار پروژه

```
ai-web-cli/
├── package.json                  # npm workspaces (server, client)
├── .env.example
├── database/                     # JSON DB (gitignored)
│   ├── users.json
│   ├── settings.json
│   ├── sessions.json
│   ├── projects.json
│   ├── conversations.json
│   ├── messages.json
│   ├── skills.json
│   ├── models.json
│   ├── agents.json
│   ├── prompts.json
│   ├── terminal.json
│   ├── logs.json
│   └── history.json
├── server/
│   └── src/
│       ├── index.ts
│       ├── env.ts
│       ├── db/           (db.ts, schema.ts, seed.ts)
│       ├── middleware/   (auth.ts, rateLimit.ts, errors.ts)
│       ├── routes/       (auth.ts, settings.ts, fs.ts, project.ts,
│       │                  skills.ts, chat.ts, conversations.ts)
│       ├── services/
│       │   ├── llm/      (openai.ts, anthropic.ts, index.ts)
│       │   ├── agent/    (loop.ts, tools.ts, approvals.ts, context.ts)
│       │   ├── skills/   (scanner.ts, parser.ts)
│       │   ├── git.ts
│       │   └── fsSafe.ts
│       └── types/
└── client/
    └── src/
        ├── main.tsx, App.tsx, router.tsx
        ├── lib/api.ts
        ├── context/      (AuthContext, ProjectContext, SettingsContext)
        ├── pages/        (Login, Workspace, Settings, ProjectPicker)
        ├── components/   (Terminal/, FileTree/, ChatMessage/,
        │                  ToolCallBlock/, DiffViewer/, ApprovalModal/,
        │                  Sidebar/, TopBar/)
        └── styles/
```

---

## 🚀 شروع به کار

### پیشنیازها
- **Node.js ≥ 20**
- **npm ≥ 10**
- یک مخزن Git روی دیسک که میخواهید باز کنید.

### ۱. نصب

```bash
git clone <your-repo-url> ai-web-cli
cd ai-web-cli
npm install
```

### ۲. تنظیم محیط

فایل `.env.example` را به `.env` کپی کرده و تنظیم کنید:

```env
PORT=3001
SESSION_SECRET=change-me-to-a-long-random-string
WEbCODE_ALLOWED_ROOTS=/home/your-user
DATA_DIR=./database
```

### ۳. اجرا در حالت توسعه

```bash
npm run dev
```

- فرانتاند → [http://localhost:5173](http://localhost:5173)
- بکاند  → [http://localhost:3001](http://localhost:3001) (Vite درخواستهای `/api` را پروکسی میکند)

سرور به طور خودکار:
1. پوشه `database/` و هر فایل JSON گمشده را ایجاد میکند.
2. اگر `users.json` خالی باشد، یک حساب **admin** میسازد.
3. اطلاعات اولیه را در `database/INITIAL_CREDENTIALS.txt` مینویسد **و** در کنسول چاپ میکند.
4. تنظیمات پیشفرض را بارگذاری کرده و مهارتها را اسکن میکند.
5. API را راهاندازی کرده و فرانتاند را سرو میکند.

### ۴. اولین ورود

از اطلاعات admin در کنسول (یا `INITIAL_CREDENTIALS.txt`) استفاده کنید.  
در اولین ورود مجبور به تغییر رمز عبور خواهید شد.

### ۵. ساخت برای تولید

```bash
npm run build
npm start
```

---

## 🔐 امنیت

- **جلوگیری از پیمایش مسیر** — هر عملیات فایلسیستم از `fsSafe.ts` عبور میکند که:
  - به یک مسیر واقعی مطلق تبدیل میشود،
  - یک ریشه مجاز قابل تنظیم را اعمال میکند (`WEbCODE_ALLOWED_ROOTS`),
  - `..`، بایتهای null و سیملینکهای خارج از فضای کاری را رد میکند.
- **رمزهای عبور هششده** — `scrypt` با نمک تصادفی برای هر کاربر؛ هیچ متن سادهای ذخیره نمیشود.
- **توکنهای API هرگز سرور را ترک نمیکنند** — کلاینت فقط `apiTokenSet: true` و یک پیشنمایش ماسکشده (`sk-…abcd`) را میبیند.
- **لیست سیاه دستورات** — مسدود کردن `rm -rf /`، `sudo`، `curl | sh`، fork bombها و غیره.
- **تأیید قبل از اقدامات خطرناک** — نوشتن، حذف و دستورات شل نیاز به تأیید دارند مگر اینکه تأیید خودکار صراحتاً فعال شده باشد.
- **ورود با محدودیت نرخ** — ۱۰ تلاش در هر ۱۵ دقیقه به ازای IP + نام کاربری.
- **گزارش حسابرسی** — هر عمل تغییردهنده در `database/logs.json` نوشته میشود.
- **کوکیهای نشست** — `httpOnly`، `sameSite=lax`، `secure` در تولید.

---

## 🔌 سطح API

```
GET    /api/health
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/change-password
GET    /api/auth/me

GET    /api/settings
PUT    /api/settings
POST   /api/settings/test-connection

GET    /api/fs/browse?path=
GET    /api/fs/tree?projectId=&path=
GET    /api/fs/file?projectId=&path=

POST   /api/project/open
GET    /api/project/recent
POST   /api/project/close

GET    /api/skills?projectId=
GET    /api/conversations?projectId=
POST   /api/conversations
GET    /api/conversations/:id/messages
DELETE /api/conversations/:id

POST   /api/chat                 (SSE stream)
POST   /api/chat/approve
POST   /api/chat/abort
```

هر مسیر با `requireAuth` محافظت میشود (به جز `/api/health` و `/api/auth/login`)، با zod اعتبارسنجی میشود و در صورت خطا `{ error: "CODE", message: "..." }` برمیگرداند.

---

## 🧠 افزودن یک مهارت

یک پوشه در پروژه یا پوشه خانه خود ایجاد کنید، مثلاً:

```
.skill/example-skill/SKILL.md
```

```markdown
---
name: example-skill
description: نحوه کار مهارت نمونه را توضیح میدهد.
allowed-tools: read_file, grep
---

وقتی کاربر درباره X میپرسد، Y را انجام بده.

1. فایل کانفیگ را بخوان.
2. کلید مربوطه را grep کن.
3. نتیجه را خلاصه کن.
```

فضای کاری را دوباره بارگذاری کنید — مهارت در نوار کناری ظاهر میشود و به صورت `/example-skill` و به عنوان ابزار `skill__example-skill` در دسترس است.

---

## 🐳 داکر

```bash
docker compose up -d
```

پوشه پروژه خود و پوشه `database/` را به عنوان volume مانت کنید. به `docker-compose.yml` مراجعه کنید.

---

## 📜 اسکریپتهای npm

| اسکریپت | توضیح |
|---|---|
| `npm run dev` | اجرای سرور + کلاینت در حالت watch |
| `npm run build` | بررسی نوع و ساخت هر دو فضای کاری |
| `npm start` | اجرای سرور تولید |
| `npm run typecheck` | اجرای `tsc --noEmit` در کل monorepo |
| `npm test` | اجرای تستهای واحد (شامل تست همزمانی DB) |

---

## 🗺️ ترتیب ساخت (برای مشارکتکنندگان)

1. داربست monorepo، تنظیمات TypeScript، Tailwind، راهاندازی Express، `/api/health`.
2. لایه JSON DB با نوشتن اتمیک + تست ۱۰۰۰ نوشتن همزمان.
3. احراز هویت: seed admin، login/logout/me، نشستهای کوکی، `requireAuth`، محدودیت نرخ.
4. API تنظیمات + صفحه `/setting` + تست اتصال.
5. لایه امنیت فایلسیستم + endpointهای browse/tree/file.
6. باز کردن/اعتبارسنجی/اخیر پروژه + صفحه انتخاب پروژه.
7. اسکنر و تجزیهکننده مهارتها + `/api/skills` + لیست نوار کناری.
8. آداپتورهای ارائهدهنده LLM (OpenAI + Anthropic) با استریم.
9. حلقه عامل با ابزارها، جریان تأیید و SSE.
10. رابط کاربری فضای کار: ترمینال، رندر پیام، بلوکهای فراخوانی ابزار، نمایشگر diff، مودال تأیید.
11. دستورات اسلش و تاریخچه دستورات.
12. صیقل دادن: حالتهای خطا، اسکلتهای بارگذاری، حالتهای خالی، میانبرهای صفحهکلید، README، داکر.

---

## 🛠️ عیبیابی

| مشکل | راهحل |
|---|---|
| "This folder is not a git repository." | مطمئن شوید پوشه انتخابشده شامل پوشه `.git` است. |
| نمیتوان پوشهای خارج از home باز کرد | مسیر را به `WEbCODE_ALLOWED_ROOTS` اضافه کنید. |
| `Test connection` ناموفق است | URL API، توکن و فرمت (openai vs anthropic) را بررسی کنید. |
| دستور ترمینال هنگ میکند | `commandTimeoutMs` را در تنظیمات افزایش دهید یا فرآیند را kill کنید. |
| رمز admin را فراموش کردهاید | `database/users.json` را حذف کرده و سرور را restart کنید — اطلاعات جدید تولید میشود. |

---

## 📄 مجوز

MIT — به `LICENSE` مراجعه کنید.

---

## 🙌 تقدیر و تشکر

الهامگرفته از **Claude Code**، **OpenCode CLI**، **Codex CLI**، **Zed AI** و **Cursor Agent**.  
ساختهشده با ❤️ تنها با استفاده از Node.js، Express، TypeScript، React، Vite و فایلهای JSON ساده.