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

// Check if invoice has non-zero amount
function isNonZeroInvoice(invoice) {
  // Check total amount - the invoice object should have a total field
  const total = invoice.total ?? invoice.subtotal ?? 0;
  return total !== 0;
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
    
    // Fetch all finalized invoices by iterating through customers
    const allInvoices = [];
    
    for await (const customer of client.v1.customers.list({ limit: 100 })) {
      try {
        for await (const invoice of client.v1.customers.invoices.list({
          customer_id: customer.id,
          status: "FINALIZED",
          limit: 100,
        })) {
          allInvoices.push(invoice);
        }
      } catch (err) {
        console.log(`Error fetching invoices for customer ${customer.id}:`, err.message);
      }
    }

    // Filter non-zero invoices
    const nonZeroInvoices = allInvoices.filter(isNonZeroInvoice);

    // Void each non-zero invoice
    const results = {
      total: allInvoices.length,
      nonZeroCount: nonZeroInvoices.length,
      voided: [],
      failed: [],
    };

    for (const invoice of nonZeroInvoices) {
      try {
        await client.v1.invoices.void({ id: invoice.id });
        results.voided.push({
          id: invoice.id,
          total: invoice.total ?? invoice.subtotal,
          customer_id: invoice.customer_id,
        });
      } catch (error) {
        results.failed.push({
          id: invoice.id,
          total: invoice.total ?? invoice.subtotal,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Void All Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to void invoices",
    });
  }
}
