import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  name: string;
  location: string;
  apiKey: string;
  status: 'online' | 'offline';
  lastSeen: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: 'Unnamed Device',
    },
    location: {
      type: String,
      default: 'Unknown',
    },
    apiKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDevice>('Device', DeviceSchema);
