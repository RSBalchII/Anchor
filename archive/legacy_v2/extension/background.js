chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'queryMemories') {
    queryMemoriesFromCozoDB(request.query)
      .then(memories => ({
        success: true,
        memories: memories,
        summary: generateSummary(memories)
      }))
      .then(result => sendResponse(result))
      .catch(err => {
        console.error('[Sovereign] Error querying memories:', err);
        sendResponse({
          success: false,
          error: err.message,
          summary: null
        });
      });
    return true; // Keep channel open for async response
  }
});

async function queryMemoriesFromCozoDB(userInput) {
  try {
    // Attempt to hit the Local Bridge (Node.js Sovereign Engine)
    // The bridge now runs on port 3000 as part of the Node.js monolith
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Try the new Node.js server on port 3000
    const port = 3000;
    let response = null;
    let lastError = null;

    try {
      // First, try to ping the health endpoint to see if there's a bridge running
      const healthUrl = `http://localhost:${port}/health`;
      let healthResponse;

      try {
        healthResponse = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal
        });
      } catch (healthError) {
        console.log(`[Sovereign] Health check failed for port ${port}:`, healthError.message);
        throw healthError;
      }

      if (!healthResponse.ok) {
        console.log(`[Sovereign] Health check failed for port ${port}, status: ${healthResponse.status}`);
        throw new Error(`Health check failed with status: ${healthResponse.status}`);
      }

      console.log(`[Sovereign] Bridge detected on port ${port}, testing query...`);

      // Now try the query endpoint (the new Node.js endpoint)
      const queryUrl = `http://localhost:${port}/v1/query`;

      // Try the query without authentication (Node.js server is open)
      response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: userInput, // This should be a CozoDB query string
          params: {}
        }),
        signal: controller.signal
      });

      if (response.ok) {
        console.log(`[Sovereign] Successfully connected to bridge at port ${port}`);
        clearTimeout(timeoutId);
        return response.json();
      } else {
        console.log(`[Sovereign] Query failed with status: ${response.status}`);
        throw new Error(`Query failed with status: ${response.status}`);
      }
    } catch (e) {
      lastError = e;
      console.log(`[Sovereign] Trying bridge port ${port} failed:`, e.message);
    }

    // If all ports failed, use the last error
    clearTimeout(timeoutId);
    throw lastError || new Error(`Node.js bridge on port 3000 unavailable. Is the Sovereign Engine running?`);
  } catch (e) {
    console.warn('[Sovereign] Backend unavailable, falling back to simulated response...', e.message);
    // In the future, this can connect directly to IndexedDB via shared worker
    // For now, return simulated data
    return [
      {
        content: "This is a simulated memory based on your input: " + userInput.substring(0, 100) + "...",
        timestamp: new Date().toISOString(),
        relevance: 0.8
      }
    ];
  }
}

function generateSummary(memories) {
  if (!memories || memories.length === 0) return null;

  const maxMemories = 3;
  const relevant = memories.slice(0, maxMemories);

  return relevant
    .map((m, idx) => `[Memory ${idx + 1}] ${m.content.substring(0, 150)}...`)
    .join('\n');
}