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
      // Strip content-length, content-encoding, transfer-encoding, and set-cookie (handled separately)
      // to prevent truncation when Next.js recalculates or decompresses body length.
      if (
        lowerKey !== "content-length" &&
        lowerKey !== "content-encoding" &&
        lowerKey !== "transfer-encoding" &&
        lowerKey !== "set-cookie"
      ) {
        responseHeaders.set(key, val);
      }
    });

    const isHttps = req.url.startsWith("https://") || req.headers.get("x-forwarded-proto") === "https";

    // Extract all Set-Cookie headers properly and adapt Secure flag to protocol
    if (typeof res.headers.getSetCookie === "function") {
      const cookies = res.headers.getSetCookie();
      for (let cookie of cookies) {
        if (!isHttps) {
          cookie = cookie.replace(/;\s*Secure/gi, "");
        }
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      let cookieHeader = res.headers.get("set-cookie");
      if (cookieHeader) {
        if (!isHttps) {
          cookieHeader = cookieHeader.replace(/;\s*Secure/gi, "");
        }
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
