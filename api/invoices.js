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

  try {
    const client = getMetronomeClient(req);

    // GET: List invoices by status
    if (req.method === "GET") {
      // Get status from query parameter (default to FINALIZED)
      const status = req.query?.status || "FINALIZED";
      
      // First, get all customers
      const allInvoices = [];
      
      // Fetch all customers using pagination
      for await (const customer of client.v1.customers.list({ limit: 100 })) {
        // For each customer, fetch their invoices with the specified status
        try {
          for await (const invoice of client.v1.customers.invoices.list({
            customer_id: customer.id,
            status: status,
            limit: 100,
          })) {
            allInvoices.push(invoice);
          }
        } catch (err) {
          // Skip customers with no invoices or errors
          console.log(`Error fetching invoices for customer ${customer.id}:`, err.message);
        }
      }

      return res.status(200).json({
        success: true,
        invoices: allInvoices,
        count: allInvoices.length,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}
