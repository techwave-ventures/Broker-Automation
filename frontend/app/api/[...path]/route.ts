import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join("/");
  const url = new URL(req.url);
  const backendUrl = `${BACKEND_URL}/api/${path}${url.search}`;

  // Clone headers
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");

  const reqInit: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      reqInit.body = await req.text();
    } catch {
      // Ignore body errors
    }
  }

  try {
    const res = await fetch(backendUrl, reqInit);
    
    // Read response body as text
    const body = await res.text();
    
    // Return proxied response
    const responseHeaders = new Headers();

    res.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      // Avoid forwarding content encoding chunking that Next.js handles, and handle set-cookie separately
      if (lowerKey !== "content-encoding" && lowerKey !== "transfer-encoding" && lowerKey !== "set-cookie") {
        responseHeaders.set(key, val);
      }
    });

    // Extract all Set-Cookie headers properly
    if (typeof res.headers.getSetCookie === "function") {
      const cookies = res.headers.getSetCookie();
      for (const cookie of cookies) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const cookieHeader = res.headers.get("set-cookie");
      if (cookieHeader) {
        responseHeaders.set("set-cookie", cookieHeader);
      }
    }

    return new NextResponse(body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy failure to ${backendUrl}:`, error);
    return NextResponse.json({ error: "Backend service unavailable" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
