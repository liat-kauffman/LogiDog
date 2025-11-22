export function getDaysUntil(dateStr) {
  const promised = new Date(dateStr);
  const now = new Date();
  const diffMs = promised - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays;
}

// Max allowed hours in each stage before we consider it "stuck"
export const MAX_HOURS_PER_STAGE = {
  CREATED: 12,
  SORTING: 8,
  IN_TRANSIT: 30,
  CUSTOMS_HOLD: 24,
  OUT_FOR_DELIVERY: 10,
};

export function normalizeStage(stage) {
  return stage.toUpperCase().replace(/\s+/g, "_");
}

// Helper to broadcast sse event
export function broadcastSse(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => client.res.write(payload));
}
