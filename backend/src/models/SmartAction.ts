import mongoose, { Schema, Document } from 'mongoose';

export interface ISmartAction extends Document {
  name: string;
  cardUID: string | null;
  userId: mongoose.Types.ObjectId | null;
  trigger: 'on_authorized' | 'on_denied' | 'on_any';
  provider: string;
  action: string;
  config: Record<string, any>;
  isEnabled: boolean;
  priority: number;
  cooldownMs: number;
  lastExecuted: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SmartActionSchema = new Schema<ISmartAction>(
  {
    name: {
      type: String,
      required: [true, 'Action name is required'],
      trim: true,
    },
    cardUID: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    trigger: {
      type: String,
      enum: ['on_authorized', 'on_denied', 'on_any'],
      default: 'on_authorized',
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'Action type is required'],
      trim: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 10,
    },
    cooldownMs: {
      type: Number,
      default: 2000,
    },
    lastExecuted: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup during card validation
SmartActionSchema.index({ cardUID: 1, isEnabled: 1, trigger: 1 });
SmartActionSchema.index({ userId: 1, isEnabled: 1, trigger: 1 });

export default mongoose.model<ISmartAction>('SmartAction', SmartActionSchema);
