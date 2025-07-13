import mongoose, { Document, Schema } from 'mongoose';

export enum AccessTier {
  OneDay = '1day',
  OneWeek = '1week',
  OneMonth = '1month',
  ThreeMonths = '3month',
  Lifetime = 'lifetime',
}

interface Key {
  value: string;
  days: number;
  note: string;
  createdAt: Date;
}

interface Invite {
  code: string;
  usedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface IUser extends Document {
  discordId: string;
  username: string;
  accessTier: AccessTier;
  accessExpires: Date | null;
  generatedKeys: Key[];
  invites: Invite[];
  totalInvites: number; 
  invitedBy: mongoose.Types.ObjectId | null;
  isActive: boolean;
  lastKeyGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    lastKeyGeneratedAt: {
      type: Date,
      default: null,
    },
    accessTier: {
      type: String,
      enum: Object.values(AccessTier),
      required: true,
    },
    accessExpires: {
      type: Date,
      default: null,
    },
    generatedKeys: [
      {
        value: {
          type: String,
          required: true,
        },
        days: {
          type: Number,
          required: true,
        },
        note: {
          type: String,
          default: '',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    invites: [
      {
        code: {
          type: String,
          required: true,
        },
        usedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          default: null,
        },
      },
    ],
    totalInvites: {
      type: Number,
      default: 0,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
