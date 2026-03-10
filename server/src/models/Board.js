import mongoose from 'mongoose';

const CardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    position: { type: Number, default: 0 },
  },
  { _id: true }
);

const ListSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    position: { type: Number, default: 0 },
    cards: [CardSchema],
  },
  { _id: true }
);

const MembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'editor',
    },
  },
  { _id: false }
);

const BoardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [MembershipSchema],
    lists: [ListSchema],
  },
  { timestamps: true }
);

export const Board = mongoose.model('Board', BoardSchema);

