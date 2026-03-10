import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import boardsRouter from './routes/boards.js';
import authRouter from './routes/auth.js';
import notificationsRouter from './routes/notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/trello_clone';

app.use(
  cors({
    origin: "https://trello-clone-m24w.vercel.app",
    credentials: true,
  })
);
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
  res.json({ message: 'Trello clone API running' });
});

app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/notifications', notificationsRouter);

mongoose
  .connect(MONGO_URI, { dbName: 'trello_clone' })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

