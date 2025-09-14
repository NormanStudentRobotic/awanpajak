# AwanPajak – Auth Edition (Firebase Email/Password)
Fitur: Login & Create Account dengan Firebase Auth, lalu akses kalkulator pajak (PPN/PPh) via serverless API.

## Setup Firebase (Email/Password)
1. Buka https://console.firebase.google.com → Add project.
2. Tambah app **Web** → salin config (`apiKey`, `authDomain`, `projectId`, `appId`).
3. Authentication → Sign-in method → aktifkan **Email/Password**.
4. Buka `index.html` → ganti placeholder `firebaseConfig` dengan config milikmu.

## Deploy
- Upload file ke GitHub (ganti file lama).
- Vercel akan auto-deploy.
