import express from 'express';
import db from '../db.js';
import { isLoggedIn } from '../middleware/auth.js';

const router = express.Router();

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const { post_id } = req.query;
    const [comments] = await db.execute(`
      SELECT c.*, u.first_name, u.last_name, u.photo
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `, [post_id]);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', isLoggedIn, async (req, res) => {
  try {
    const { post_id, body } = req.body;
    const [result] = await db.execute(
      'INSERT INTO comments (user_id, post_id, body) VALUES (?, ?, ?)',
      [req.session.userId, post_id, body]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;