const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

        const validRole = role === 'admin' ? 'admin' : 'user';
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
