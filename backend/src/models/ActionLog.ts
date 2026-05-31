import mongoose, { Schema, Document } from 'mongoose';

export interface IActionLog extends Document {
  actionId: mongoose.Types.ObjectId;
  actionName: string;
  provider: string;
  cardUID: string;
  userId: mongoose.Types.ObjectId | null;
  status: 'success' | 'failed' | 'skipped';
  error: string | null;
  durationMs: number;
  timestamp: Date;
}

const ActionLogSchema = new Schema<IActionLog>({
  actionId: {
    type: Schema.Types.ObjectId,
    ref: 'SmartAction',
    required: true,
  },
  actionName: {
    type: String,
    required: true,
  },
  provider: {
    type: String,
    required: true,
  },
  cardUID: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'skipped'],
    required: true,
  },
  error: {
    type: String,
    default: null,
  },
  durationMs: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient log queries
ActionLogSchema.index({ timestamp: -1 });
ActionLogSchema.index({ actionId: 1, timestamp: -1 });

export default mongoose.model<IActionLog>('ActionLog', ActionLogSchema);
