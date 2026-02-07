import { AuthResponse, User } from "../types";

// ==================================================================================
//  BACKEND IMPLEMENTATION GUIDE (Node.js + MySQL)
// ==================================================================================
/*
  To connect your React frontend to a real database, follow this structure:

  STEP 1: Install Dependencies
  ----------------------------
  npm install express mysql2 dotenv cors bcryptjs jsonwebtoken

  STEP 2: Create Database Config (backend/db.js)
  ----------------------------------------------
  This file manages the connection pool. Using a pool is better than a single 
  connection because it handles multiple concurrent requests efficiently.

  const mysql = require('mysql2/promise');
  require('dotenv').config();

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'auth_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Test the connection
  pool.getConnection()
    .then(conn => {
      console.log("Database connected successfully");
      conn.release();
    })
    .catch(err => {
      console.error("Database connection failed:", err);
    });

  module.exports = pool;

  STEP 3: Create Server & Routes (backend/server.js)
  --------------------------------------------------
  const express = require('express');
  const cors = require('cors');
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const db = require('./db'); // Import the pool from step 2

  const app = express();
  app.use(express.json());
  app.use(cors());

  // --- REGISTER ---
  app.post('/api/register', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      
      // 1. Check if user exists
      const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (existing.length > 0) return res.status(409).json({ message: 'Email already exists' });

      // 2. Hash password
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const validRole = role === 'admin' || role === 'internal_staff' ? role : 'user';

      // 3. Insert into DB
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, hash, validRole]
      );

      // 4. Sign Token
      const token = jwt.sign({ id: result.insertId, email, role: validRole }, process.env.JWT_SECRET);
      
      res.status(201).json({ token, user: { id: result.insertId, name, email, role: validRole } });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // --- LOGIN ---
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);
      
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.listen(5000, () => console.log('Server running on port 5000'));
*/

// ==================================================================================
//  FRONTEND API INTEGRATION (Node.js + MySQL backend)
// ==================================================================================

const STORAGE_TOKEN_KEY = 'mock_jwt_token';
const STORAGE_USER_SESSION = 'mock_user_session';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

// 1. REGISTER (backend)
export const register = async (
  name: string,
  email: string,
  password: string,
  role: 'user' | 'admin' | 'internal_staff' = 'user'
): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Registration failed.");
  }

  const data: AuthResponse = await res.json();
  localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
  localStorage.setItem(STORAGE_USER_SESSION, JSON.stringify(data.user));
  return data;
};

// 2. LOGIN (backend)
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Invalid email or password.");
  }

  const data: AuthResponse = await res.json();
  localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
  localStorage.setItem(STORAGE_USER_SESSION, JSON.stringify(data.user));
  return data;
};

// 3. REQUEST PASSWORD RESET (OTP)
export const requestPasswordReset = async (email: string): Promise<{ message: string; otp?: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to request OTP.");
  }

  return await res.json();
};

// 4. VERIFY OTP
export const verifyOtp = async (email: string, otp: string): Promise<{ verified: boolean; message: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "OTP verification failed.");
  }

  return await res.json();
};

// 5. RESET PASSWORD
export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<{ message: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, newPassword })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Password reset failed.");
  }

  return await res.json();
};

// 3. LOGOUT
export const logout = () => {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_SESSION);
};

// 6. CHECK AUTH
export const getStoredUser = (): User | null => {
  const userRaw = localStorage.getItem(STORAGE_USER_SESSION);
  if (!userRaw) return null;
  return JSON.parse(userRaw);
};
