# KWASU Automated Complaint Management System

A web-based system for Kwara State University that lets students submit
complaints online, automatically classifies them with machine learning,
flags abusive language for human review, and gives administrators a
dashboard to verify students and manage complaints.

> **Categories:** This build classifies complaints into **two** categories —
> **Academic** and **Administrative** — because the provided dataset only
> contains those two labels. (The original brief listed four; Facility and
> Finance are not present in the data and cannot be predicted. See
> `ml_training/training_results.txt`.)

---

## Tech stack

| Layer        | Technology                                   |
|--------------|----------------------------------------------|
| Frontend     | React (Vite)                                 |
| Backend      | Python + Flask (REST API)                    |
| Database     | MySQL (SQLAlchemy ORM)                        |
| ML           | scikit-learn (Naïve Bayes + SVM, TF-IDF)     |
| Auth         | JWT (login with email **or** matric number)  |
| Hosting      | Vercel (frontend) · Render (backend) · Railway/PlanetScale (MySQL) |

---

## Features

**Students**
- Sign up with email + matric number + password; log in with **either** email or matric number
- Complete a profile (name, matric, department, level) that an admin must verify
- Editing the profile resets it to *pending* and requires re-approval
- View the complaint feed; verified students can submit complaints and comment
- Track personal complaint status and admin responses

**Automatic processing on submit**
1. Abuse detection runs first (profanity wordlist + regex). If flagged → flagged queue, **not** published, **not** classified.
2. If clean → preprocessing → TF-IDF → chi-square feature selection → ML classification → stored as *Pending* and published to the feed.

**Admins** (two dashboard sections)
- **Profile Management:** approve / reject (with reason) / permanently ban
- **Complaint Management:** normal queue + flagged queue; change category, update status (Pending → In Progress → Resolved), add response, clear a false-positive flag (publishes it) or confirm abuse
- **Overview:** complaint counts by category + last-7-days trend

---

## Project structure

```
kwasu-complaints/
├── frontend/      React app (Vite)
├── backend/       Flask API + trained models + abuse wordlist
├── ml_training/   train.py, dataset.csv, training_results.txt
├── database/      schema.sql
├── .env.example
└── README.md
```

---

## Local setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8 (or use the bundled SQLite fallback for quick testing)

### 1. Database
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# configure environment (copy from the root example)
cp ../.env.example .env
# edit .env: set DATABASE_URL, ADMIN_REG_CODE, SECRET_KEY, JWT_SECRET

python run.py        # serves on http://localhost:5000
```

> **Quick test without MySQL:** set
> `DATABASE_URL=sqlite:///kwasu.db` in `.env` and the app will run on a
> local SQLite file.

### 3. Train the ML models (optional — pre-trained .pkl files are included)
```bash
cd ml_training
pip install scikit-learn pandas numpy
python train.py
# writes vectorizer.pkl, selector.pkl, classifier.pkl to backend/models/
# and training_results.txt
```

### 4. Frontend
```bash
cd frontend
npm install
cp .env.example .env        # set VITE_API_URL=http://localhost:5000/api
npm run dev                 # serves on http://localhost:5173
```

---

## First run

1. Open the frontend, go to **Admin registration**, and create an admin
   using the `ADMIN_REG_CODE` you set in `.env`.
2. Register a student account, fill in the profile.
3. Log in as the admin and approve the student in **Profile Management**.
4. Log back in as the student and submit a complaint.

---

## Deployment

### Frontend → Vercel
- Import the `frontend/` folder as a Vercel project (framework preset: **Vite**).
- Set env var `VITE_API_URL = https://<your-backend>.onrender.com/api`.
- Deploy. You get a `*.vercel.app` URL.

### Backend → Render
- New **Web Service** from the `backend/` folder (or use `render.yaml`).
- Build: `pip install -r requirements.txt`
- Start: `gunicorn 'app:create_app()' --bind 0.0.0.0:$PORT`
- Env vars: `SECRET_KEY`, `JWT_SECRET`, `ADMIN_REG_CODE`, `DATABASE_URL`, `CORS_ORIGINS` (set this to your Vercel URL).

> **Note:** Render's free tier sleeps after inactivity, so the first request
> after idle can take ~30–60s to wake. Classification itself is well under
> 1 second; only the cold start is slow.

### Database → Railway or PlanetScale
- Create a MySQL instance, copy its connection string into `DATABASE_URL`
  (format `mysql+pymysql://user:pass@host:port/dbname`), and run
  `database/schema.sql` against it once.

---

## Abuse wordlist

`backend/data/profanity_list.txt` ships with a small starter list so the app
runs out of the box. For real use, replace/extend it with a full open-source
list such as **LDNOOBW – "List of Dirty, Naughty, Obscene and Otherwise Bad
Words"** (download `en.txt` and append). Regex phrase patterns live in
`backend/app/ml/abuse_detector.py`.

---

## Security notes
- Passwords are hashed (Werkzeug PBKDF2). No plaintext storage.
- All secrets come from environment variables; nothing is hardcoded.
- SQLAlchemy parameterises queries (guards against SQL injection).
- JWT tokens expire (default 12h).
- Admin registration is gated by a shared code.

## Deliverables map (per brief)
- Web application → `frontend/` + `backend/`
- Source + docs → this repo + README
- Trained models → `backend/models/*.pkl`
- Database schema → `database/schema.sql`
- Training results → `ml_training/training_results.txt`
- User manual → see "First run" above
