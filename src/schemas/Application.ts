import { Schema, model, models } from 'mongoose';

interface IApplication {
  userId: string;
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
  handledBy: string;
  handledAt: Date;
  expiresAt?: Date;
}

const ApplicationSchema = new Schema<IApplication>({
  userId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  reason: { type: String },
  handledBy: { type: String, required: true },
  handledAt: { type: Date, default: Date.now },
  expiresAt: { 
    type: Date,
    // 31 days from now for denied applications
    default: function(this: IApplication) {
      if (this.status === 'denied') {
        const date = new Date();
        date.setDate(date.getDate() + 31);
        return date;
      }
      return undefined;
    }
  }
});

// Index for faster queries on userId and status
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // For TTL

export const Application = models.Application || model<IApplication>('Application', ApplicationSchema);

// Helper function to check if user can reapply
export async function canReapply(userId: string): Promise<{ canReapply: boolean; daysLeft?: number }> {
  const deniedApp = await Application.findOne({ 
    userId, 
    status: 'denied',
    expiresAt: { $gt: new Date() }
  }).sort({ handledAt: -1 });

  if (!deniedApp) return { canReapply: true };

  const now = new Date();
  const timeLeft = deniedApp.expiresAt!.getTime() - now.getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
  
  return { 
    canReapply: false, 
    daysLeft 
  };
}
