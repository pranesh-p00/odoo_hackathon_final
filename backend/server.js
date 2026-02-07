const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db'); // Ensure you have a db.js file as created earlier
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Test Route
app.get('/', (req, res) => {
    res.send('Auth System API is running...');
});

// 2. Register Route
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'Email exists' });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const validRole = role === 'admin' || role === 'internal_staff' ? role : 'user';
        const [result] = await db.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', 
            [name, email, hashed, validRole]);

        const token = jwt.sign({ id: result.insertId, email, role: validRole }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token, user: { id: String(result.insertId), name, email, role: validRole } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, users[0].password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Wrong password' });

        const token = jwt.sign({ id: users[0].id, email: users[0].email, role: users[0].role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: String(users[0].id), name: users[0].name, email: users[0].email, role: users[0].role } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. Request Password Reset (OTP)
app.post('/api/request-password-reset', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query('SELECT id, email FROM users WHERE email = ?', [email]);

        // Always respond with success to avoid user enumeration
        if (users.length === 0) {
            return res.json({ message: 'If the email exists, an OTP has been sent.' });
        }

        const user = users[0];
        const otp = crypto.randomInt(100000, 1000000).toString(); // 6-digit OTP
        const otpHash = await bcrypt.hash(otp, 10);

        // OTP expires in 10 minutes
        await db.query(
            'INSERT INTO password_resets (user_id, otp_hash, expires_at, used) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)',
            [user.id, otpHash]
        );

        // Replace this with email/SMS delivery in production
        console.log(`OTP for ${user.email}: ${otp}`);

        res.json({
            message: 'If the email exists, an OTP has been sent.',
            ...(process.env.SHOW_OTP === 'true' ? { otp } : {})
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Verify OTP
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: 'Invalid OTP' });

        const userId = users[0].id;
        const [rows] = await db.query(
            'SELECT id, otp_hash, expires_at, used FROM password_resets WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [userId]
        );

        if (rows.length === 0) return res.status(400).json({ message: 'Invalid OTP' });

        const record = rows[0];
        if (record.used) return res.status(400).json({ message: 'OTP already used' });
        if (new Date(record.expires_at).getTime() < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        const isMatch = await bcrypt.compare(otp, record.otp_hash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

        res.json({ verified: true, message: 'OTP verified' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. Reset Password
app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: 'Invalid OTP' });

        const userId = users[0].id;
        const [rows] = await db.query(
            'SELECT id, otp_hash, expires_at, used FROM password_resets WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [userId]
        );

        if (rows.length === 0) return res.status(400).json({ message: 'Invalid OTP' });

        const record = rows[0];
        if (record.used) return res.status(400).json({ message: 'OTP already used' });
        if (new Date(record.expires_at).getTime() < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        const isMatch = await bcrypt.compare(otp, record.otp_hash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, userId]);
        await db.query('UPDATE password_resets SET used = 1 WHERE id = ?', [record.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
