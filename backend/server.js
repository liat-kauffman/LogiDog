import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Load shipments from JSON file
const shipmentsPath = path.join(__dirname, "shipments.json");
let shipments = JSON.parse(fs.readFileSync(shipmentsPath, "utf-8"));

// Get at-risk shipments
app.get("/api/shipments/at-risk", (req, res) => {
  const { riskLevel, serviceLevel, destination, isDelayed, category, search } =
    req.query;

  let result = [...shipments];

  // Only show shipments that are delayed or have riskLevel != none
  result = result.filter(
    (shipment) => shipment.isDelayed === true || shipment.riskLevel !== "none"
  );

  if (riskLevel) {
    result = result.filter((shipment) => shipment.riskLevel === riskLevel);
  }

  if (serviceLevel) {
    result = result.filter(
      (shipment) => shipment.serviceLevel === serviceLevel
    );
  }

  if (destination) {
    result = result.filter((shipment) =>
      shipment.destination.toLowerCase().includes(destination.toLowerCase())
    );
  }

  if (category) {
    result = result.filter((shipment) => shipment.category === category);
  }

  if (isDelayed !== undefined) {
    const delayedBool = isDelayed === "true";
    result = result.filter((shipment) => shipment.isDelayed === delayedBool);
  }

  if (search) {
    result = result.filter((shipment) =>
      shipment.shipmentId.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json({
    data: result,
    meta: {
      total: result.length,
    },
  });
});
