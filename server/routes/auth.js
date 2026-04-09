import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/')),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const { first_name, last_name, age, gender, username, password } = req.body;
    const photo = req.file ? req.file.filename : null;

    if (parseInt(age) < 13) {
      return res.status(400).json({ error: 'Věk musí být alespoň 13 let' });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      'INSERT INTO users (first_name, last_name, age, gender, photo, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, age, gender, photo, username, hash]
    );

    req.session.userId = result.insertId;
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Uživatelské jméno již existuje' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Špatné jméno nebo heslo' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Špatné jméno nebo heslo' });
    }

    req.session.userId = user.id;
    res.json({ ok: true, user: { id: user.id, first_name: user.first_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, userId: req.session.userId });
  } else {
    res.json({ loggedIn: false });
  }
});

export default router;