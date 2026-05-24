import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'visitor';
  password?: string;  // Only for admin users (dashboard login)
  cardUID: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'employee', 'visitor'],
      default: 'employee',
    },
    password: {
      type: String,
      select: false,  // Don't include in queries by default
    },
    cardUID: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Partial index: unique only when cardUID is NOT null
// This allows multiple users with cardUID: null
UserSchema.index(
  { cardUID: 1 },
  {
    unique: true,
    partialFilterExpression: { cardUID: { $type: 'string' } },
  }
);

export default mongoose.model<IUser>('User', UserSchema);
