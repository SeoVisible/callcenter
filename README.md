# CallCenter Project

A modern Next.js + Prisma + PostgreSQL call center management app with CRUD for users, products, clients, and invoices.

## Features

- Next.js 15 (App Router, TypeScript)
- PostgreSQL via Prisma ORM
- User authentication (JWT)
- CRUD for Users, Products, Clients, Invoices
- Modular React UI components
- PDF/email export for invoices
- Tailwind CSS for styling

---

## Prerequisites

- Node.js v18 or later
- npm (comes with Node.js)
- PostgreSQL database (local or remote)

---

## 1. Clone the Repository

```bash
git clone https://github.com/SeoVisible/callcenter.git
cd callcenter
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env` file in the root directory:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=your-secret-key
```

Replace the values with your PostgreSQL credentials and a secure JWT secret.

---

## 4. Set Up the Database

Run Prisma migrations to set up the database schema:

```bash
npx prisma migrate deploy
```

Generate the Prisma client:

```bash
npx prisma generate
```

---

## 5. Start the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Build for Production

```bash
npm run build
npm start
```

---

## 7. Linting & Formatting

Run ESLint:

```bash
npm run lint
```

---

## 8. Useful Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm start` — Start production server
- `npx prisma studio` — Open Prisma Studio (DB GUI)

---

## 9. Troubleshooting

- Ensure your PostgreSQL server is running and accessible.
- Check `.env` for correct credentials.
- If you change the schema, re-run `npx prisma migrate dev` and `npx prisma generate`.

---

## 10. License

MIT
