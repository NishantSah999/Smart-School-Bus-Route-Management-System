let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  return io;
}

// Broadcast a live event to rooms. Rooms: school:{id}, bus:{id}, user:{id}.
function emit(event, payload, rooms = []) {
  if (!io) return;
  const target = rooms.length ? rooms : null;
  if (target) target.forEach((r) => io.to(r).emit(event, payload));
  else io.emit(event, payload);
}

module.exports = { setIO, getIO, emit };