import Metronome from "@metronome/sdk";

// Initialize Metronome client with API key from request header or env
function getMetronomeClient(req) {
  // Prefer header API key, fall back to environment variable
  const apiKey = req.headers["x-metronome-api-key"] || process.env.METRONOME_API_KEY;
  if (!apiKey) {
    throw new Error("Metronome API key is required. Please provide it in the frontend or set METRONOME_API_KEY environment variable.");
  }
  return new Metronome({ bearerToken: apiKey });
}

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Metronome-Api-Key");
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = getMetronomeClient(req);
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: "invoiceId is required",
      });
    }

    // Void the invoice
    const result = await client.v1.invoices.void({ id: invoiceId });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Void Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to void invoice",
    });
  }
}
