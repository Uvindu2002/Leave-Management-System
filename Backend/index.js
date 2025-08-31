import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sql from "./db.js"; // <-- your db connection

import userRoutes from './routes/userRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import managerRoutes from './routes/managerRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/manager', managerRoutes);

// Test DB connection
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`;
    res.json({ db_time: result[0].now });
  } catch (err) {
    res.status(500).json({ error: "Database connection failed", details: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
