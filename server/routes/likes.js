import express from 'express';
import db from '../db.js';
import { isLoggedIn } from '../middleware/auth.js';

const router = express.Router();

router.post('/', isLoggedIn, async (req, res) => {
  try {
    const { post_id } = req.body;
    await db.execute(
      'INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)',
      [req.session.userId, post_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', isLoggedIn, async (req, res) => {
  try {
    const { post_id } = req.body;
    await db.execute(
      'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
      [req.session.userId, post_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const { post_id } = req.query;
    const [likes] = await db.execute(`
      SELECT u.first_name, u.last_name, l.created_at
      FROM likes l
      JOIN users u ON u.id = l.user_id
      WHERE l.post_id = ?
      ORDER BY l.created_at DESC
    `, [post_id]);
    res.json(likes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;