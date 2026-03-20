import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IFile extends Document {
  originalName: string;
  storedName: string;
  path: string;
  size: number;
  expiresAt: Date;
  maxDownloads: number;
  downloadCount: number;
  password?: string;
  createdAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    originalName: {
      type: String,
      required: true,
    },
    storedName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    maxDownloads: {
      type: Number,
      default: 1,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

// Hash password before saving if it is present and modified
fileSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

export const File = mongoose.model<IFile>('File', fileSchema);
