import mongoose, { Document, Model, Schema } from 'mongoose';

export type NoteColorId =
  | 'default'
  | 'coral'
  | 'peach'
  | 'sand'
  | 'mint'
  | 'sage'
  | 'fog'
  | 'storm'
  | 'dusk'
  | 'blossom'
  | 'clay';

export interface INote extends Document {
  title: string;
  content: string;
  color: NoteColorId;
  isPinned: boolean;
  isImportant: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  labels: string[];
  checklist?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  noteType: 'text' | 'checklist' | 'image' | 'voice';
  images: string[];
  audioUrl?: string | null;
  reminder?: Date | null;
  reminderSent?: boolean;
  isLocked: boolean;
  password?: string | null;
  unlockedUntil?: Date | null;
  userId?: mongoose.Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CheckItemSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const NoteSchema = new Schema<INote>(
  {
    title: { type: String, default: '', trim: true },
    content: { type: String, default: '' },
    color: {
      type: String,
      default: 'default',
      enum: [
        'default',
        'coral',
        'peach',
        'sand',
        'mint',
        'sage',
        'fog',
        'storm',
        'dusk',
        'blossom',
        'clay',
      ],
    },
    isPinned: { type: Boolean, default: false, index: true },
    isImportant: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    isTrashed: { type: Boolean, default: false, index: true },
    labels: [{ type: String, trim: true }],
    checklist: [CheckItemSchema],
    noteType: {
      type: String,
      default: 'text',
      enum: ['text', 'checklist', 'image', 'voice'],
      index: true,
    },
    images: [{ type: String }],
    audioUrl: { type: String, default: null },
    reminder: { type: Date, default: null },
    reminderSent: { type: Boolean, default: false, index: true },
    isLocked: { type: Boolean, default: false, index: true },
    password: { type: String, default: null },
    unlockedUntil: { type: Date, default: null, index: true },
    userId: { type: Schema.Types.Mixed, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        if (ret._id) {
          ret.id = String(ret._id);
        }
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
