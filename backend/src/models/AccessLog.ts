import mongoose, { Schema, Document } from 'mongoose';

export interface IAccessLog extends Document {
  uid: string;
  userId: mongoose.Types.ObjectId | null;
  deviceId: string;
  status: 'authorized' | 'denied' | 'unknown';
  timestamp: Date;
}

const AccessLogSchema = new Schema<IAccessLog>({
  uid: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  deviceId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['authorized', 'denied', 'unknown'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient log queries
AccessLogSchema.index({ timestamp: -1 });
AccessLogSchema.index({ uid: 1, timestamp: -1 });

export default mongoose.model<IAccessLog>('AccessLog', AccessLogSchema);
