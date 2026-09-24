const Notification = require('../models/Notification');

let io = null;
const setIo = (instance) => { io = instance; };

const idOf = (ref) => (ref && ref._id ? ref._id : ref);

// Create an in-app notification for each recipient (never the person who acted)
// and push it live to their personal socket room.
// Message notifications collapse: one unread entry per complaint, refreshed on each new message.
async function notify({ to, actorId, type, complaint, title, body = '' }) {
  const recipients = [...new Set(to.filter(Boolean).map((r) => String(idOf(r))))]
    .filter((id) => id !== String(actorId));

  await Promise.all(recipients.map(async (userId) => {
    let doc;
    if (type === 'message') {
      doc = await Notification.findOneAndUpdate(
        { userId, type, complaintId: complaint._id, read: false },
        { title, body },
        { new: true }
      );
    }
    if (!doc) doc = await Notification.create({ userId, type, complaintId: complaint._id, title, body });
    io?.to(`user:${userId}`).emit('notification', doc);
  }));
}

// Notification failures must never break the action that triggered them
const notifySafe = (args) => notify(args).catch((err) => console.error('notify failed:', err.message));

module.exports = { notify: notifySafe, setIo };
