import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, default: '' },
  avatar: { type: String, default: null },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, default: null },
  tokenExpiresAt: { type: Date, required: true },
  guilds: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default mongoose.model('Session', sessionSchema);
