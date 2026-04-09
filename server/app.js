import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import authRouter     from './routes/auth.js';
import postsRouter    from './routes/posts.js';
import commentsRouter from './routes/comments.js';
import likesRouter    from './routes/likes.js';
import usersRouter    from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));

app.use('/api/auth',     authRouter);
app.use('/api/posts',    postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/likes',    likesRouter);
app.use('/api/users',    usersRouter);

app.listen(3000, () => console.log('Server běží na http://localhost:3000'));