import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// SSE endpoint for real-time updates
// This proxies to the backend SSE endpoint when available,
// or provides a simulated stream for development

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const tenantId = request.headers.get('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000';

  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if backend SSE is available
  const backendSSEUrl = process.env.CORE_SERVICE_URL || 'http://localhost:8084';

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send SSE message helper
  const sendMessage = async (event: string, data: object) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start streaming
  (async () => {
    try {
      // Send initial connection message
      await sendMessage('connected', {
        client_id: `web_${Date.now()}`,
        timestamp: new Date().toISOString(),
      });

      // Try to connect to backend SSE if available
      const backendAvailable = await checkBackendSSE(backendSSEUrl, accessToken, tenantId);

      if (backendAvailable) {
        // Proxy backend SSE stream
        await proxyBackendSSE(backendSSEUrl, accessToken, tenantId, writer, encoder);
      } else {
        // Development mode: simulate events with heartbeat
        await simulateSSEStream(writer, encoder, request.signal);
      }
    } catch (error) {
      console.error('SSE stream error:', error);
    } finally {
      try {
        await writer.close();
      } catch {
        // Writer already closed
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function checkBackendSSE(
  baseUrl: string,
  token: string,
  tenantId: string
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${baseUrl}/api/v1/events/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function proxyBackendSSE(
  baseUrl: string,
  token: string,
  tenantId: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/v1/events`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Accept': 'text/event-stream',
    },
  });

  if (!response.ok || !response.body) {
    throw new Error('Backend SSE connection failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    await writer.write(encoder.encode(chunk));
  }
}

async function simulateSSEStream(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  signal: AbortSignal
): Promise<void> {
  const sendMessage = async (event: string, data: object) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Send heartbeat every 30 seconds
  const heartbeatInterval = setInterval(async () => {
    if (signal.aborted) {
      clearInterval(heartbeatInterval);
      return;
    }
    try {
      await writer.write(encoder.encode(': ping\n\n'));
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Simulate some events for development
  const events = [
    { delay: 5000, event: 'dashboard.update', data: { type: 'metrics_refresh', timestamp: new Date().toISOString() } },
  ];

  for (const evt of events) {
    if (signal.aborted) break;
    await new Promise(resolve => setTimeout(resolve, evt.delay));
    if (signal.aborted) break;
    await sendMessage(evt.event, evt.data);
  }

  // Keep connection alive until aborted
  while (!signal.aborted) {
    await new Promise(resolve => setTimeout(resolve, 60000));
  }

  clearInterval(heartbeatInterval);
}
