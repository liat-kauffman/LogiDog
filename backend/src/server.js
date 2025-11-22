import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  MAX_HOURS_PER_STAGE,
  getDaysUntil,
  normalizeStage,
} from "../utilities/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const shipmentsPath = path.join(__dirname, "shipments.json");
let shipments = JSON.parse(fs.readFileSync(shipmentsPath, "utf-8"));

app.get("/api/shipments/at-risk", (req, res) => {
  const { riskLevel, serviceLevel, destination, isDelayed, category, search } =
    req.query;

  let result = [...shipments];

  // only show shipments that are delayed or have riskLevel != none
  result = result.filter((s) => s.isDelayed === true || s.riskLevel !== "none");

  if (riskLevel) {
    result = result.filter((s) => s.riskLevel === riskLevel);
  }

  if (serviceLevel) {
    result = result.filter((s) => s.serviceLevel === serviceLevel);
  }

  if (destination) {
    result = result.filter((s) =>
      s.destination.toLowerCase().includes(destination.toLowerCase())
    );
  }

  if (category) {
    result = result.filter((s) => s.category === category);
  }

  if (isDelayed !== undefined) {
    const delayedBool = isDelayed === "true";
    result = result.filter((s) => s.isDelayed === delayedBool);
  }

  if (search) {
    result = result.filter((s) =>
      s.shipmentId.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json({
    data: result,
    meta: {
      total: result.length,
    },
  });
});

// SSE - server side event

const sseClients = [];

app.get("/api/shipments/at-risk/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send a comment so the connection opens
  res.write(": connected\n\n");

  // Save client in memory
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  console.log("SSE client connected:", clientId);

  // Clean up on close
  req.on("close", () => {
    console.log("SSE client disconnected:", clientId);
    const idx = sseClients.findIndex((c) => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

function isShipmentAtRisk(shipment) {
  const daysUntilPromise = getDaysUntil(shipment.promisedDate);
  const stage = normalizeStage(shipment.currentStage);
  const hoursSinceScan = shipment.hoursSinceScan;

  // Time-based rule:
  // If promised date is within 2 days AND shipment is still in an early stage -> at risk
  const EARLY_STAGES = ["CREATED", "SORTING", "IN_TRANSIT"];
  if (daysUntilPromise <= 2 && EARLY_STAGES.includes(stage)) {
    return true;
  }

  // Stage-duration rule:
  // If shipment stayed too long in the same stage compared to allowed SLA -> at risk
  const maxHours = MAX_HOURS_PER_STAGE[stage];
  if (maxHours !== undefined && hoursSinceScan > maxHours) {
    return true;
  }
  // Not at risk ->
  return false;
}


console.log("LDG-1004 at risk?", isShipmentAtRisk(shipments[3])); // expected: true
console.log("LDG-1016 at risk?", isShipmentAtRisk(shipments[0])); // expected: false
console.log("LDG-1001 at risk?", isShipmentAtRisk(shipments[8])); // expected: true
