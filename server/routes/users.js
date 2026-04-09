import express from 'express';
import db from '../db.js';
import { isLoggedIn } from '../middleware/auth.js';

const router = express.Router();

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT id, first_name, last_name, age, gender, photo
      FROM users
      ORDER BY last_name ASC, first_name ASC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.execute(
      'SELECT id, first_name, last_name, age, gender, photo FROM users WHERE id = ?',
      [id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Uživatel nenalezen' });

    const [posts] = await db.execute(`
      SELECT p.*, u.first_name, u.last_name, u.photo,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [id]);

    const [activity] = await db.execute(`
      SELECT DISTINCT p.*, u.first_name, u.last_name, u.photo,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id != ?
        AND (
          EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?)
          OR
          EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.user_id = ?)
        )
      ORDER BY p.created_at DESC
    `, [id, id, id]);

    res.json({ user: users[0], posts, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;