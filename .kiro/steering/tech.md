# Technology Stack

## Backend
- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **Framework**: Express.js
- **Database**: PostgreSQL via Supabase with `postgres` library (not Prisma despite package.json)
- **Authentication**: JWT with bcryptjs for password hashing
- **Security**: Helmet, CORS, cookie-parser
- **Logging**: Morgan

## Frontend
- **Framework**: React 19 with Vite
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **Calendar**: React Big Calendar with Moment.js
- **Build Tool**: Vite with SWC plugin
- **Linting**: ESLint v9

## Development Commands

### Backend
```bash
cd Backend
npm run dev          # Start with nodemon
npm start           # Production start
npm run prisma:generate  # Generate Prisma client (legacy)
npm run prisma:studio   # Open Prisma Studio (legacy)
```

### Frontend
```bash
cd Frontend
npm run dev         # Start Vite dev server (localhost:5173)
npm run build       # Production build
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

## Environment Setup
- Backend runs on port 3000 (configurable via PORT env var)
- Frontend dev server on port 5173
- Database connection via DATABASE_URL environment variable
- JWT secret via JWT_SECRET environment variable