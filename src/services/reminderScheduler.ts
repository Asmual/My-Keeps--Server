import mongoose from 'mongoose';
import { Note } from '../models/Note';
import { User } from '../models/User';
import { sendReminderEmail } from './emailService';

let isChecking = false;
let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * Check for due reminders and dispatch email notifications
 */
export async function checkDueReminders(): Promise<number> {
  if (isChecking) return 0;
  isChecking = true;

  let sentCount = 0;
  try {
    const now = new Date();

    // Find notes whose reminder time has arrived and hasn't been emailed yet
    const dueNotes = await Note.find({
      reminder: { $ne: null, $lte: now },
      reminderSent: { $ne: true },
      isArchived: false,
      isTrashed: false,
      userId: { $ne: null },
    }).limit(50);

    if (dueNotes.length === 0) {
      isChecking = false;
      return 0;
    }

    console.log(`[ReminderScheduler] Found ${dueNotes.length} due reminder(s) to process.`);

    for (const note of dueNotes) {
      try {
        let recipientEmail: string | null = null;
        let recipientName: string | undefined = undefined;

        // Resolve user email based on note.userId
        if (note.userId) {
          const rawUserId = String(note.userId).trim();

          // 1. Direct email string check
          if (rawUserId.includes('@')) {
            recipientEmail = rawUserId;
          } else {
            // 2. Lookup in User collection by ObjectId or string id
            let userDoc = null;
            if (mongoose.isValidObjectId(rawUserId)) {
              userDoc = await User.findById(rawUserId).lean();
            }

            if (!userDoc) {
              userDoc = await User.findOne({
                $or: [{ _id: rawUserId }, { id: rawUserId }],
              }).lean();
            }

            if (userDoc && 'email' in userDoc) {
              recipientEmail = String(userDoc.email);
              recipientName = userDoc.name ? String(userDoc.name) : undefined;
            }
          }
        }

        if (recipientEmail) {
          console.log(`[ReminderScheduler] Sending reminder for note "${note.title || note.id}" to ${recipientEmail}...`);

          const result = await sendReminderEmail({
            to: recipientEmail,
            recipientName,
            noteTitle: note.title || 'Untitled Note',
            noteContent: note.content || '',
            checklist: note.checklist?.map((c) => ({
              text: c.text,
              completed: Boolean(c.completed),
            })),
            reminderTime: note.reminder as Date,
            noteId: String(note._id),
          });

          if (result.success) {
            sentCount++;
          }
        } else {
          console.warn(`[ReminderScheduler] Could not resolve email address for note ${note._id} (userId: ${note.userId})`);
        }

        // Mark reminder as sent so it won't be processed again
        note.reminderSent = true;
        await note.save();
      } catch (noteErr) {
        console.error(`[ReminderScheduler] Error processing note ${note._id}:`, noteErr);
        // Mark as sent to avoid repeated infinite loop failures on malformed data
        note.reminderSent = true;
        await note.save().catch(() => {});
      }
    }
  } catch (err) {
    console.error('[ReminderScheduler] Error in checkDueReminders cycle:', err);
  } finally {
    isChecking = false;
  }

  return sentCount;
}

/**
 * Start the background scheduler running every 60 seconds
 */
export function startReminderScheduler(intervalMs = 60000): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  console.log('⏰ [ReminderScheduler] Background reminder engine initialized (checking every 60s).');

  // Initial check 5 seconds after boot
  setTimeout(() => {
    checkDueReminders().catch((err) =>
      console.error('[ReminderScheduler] Initial check error:', err)
    );
  }, 5000);

  // Periodic interval
  schedulerTimer = setInterval(() => {
    checkDueReminders().catch((err) =>
      console.error('[ReminderScheduler] Scheduled check error:', err)
    );
  }, intervalMs);
}

/**
 * Stop the scheduler on graceful shutdown
 */
export function stopReminderScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('🛑 [ReminderScheduler] Reminder engine stopped.');
  }
}
