import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export const USER_ROLES = ['admin', 'editor', 'moderator', 'viewer'] as const;
export type UserRole = typeof USER_ROLES[number];

export interface IUser extends Document {
  alias: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    alias: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: 'viewer' },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
    next();
  } catch (error) {
    return next(error as Error);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const collectionName = `users${process.env.DB_COLLECTION_SUFFIX || ''}`;

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema, collectionName);
