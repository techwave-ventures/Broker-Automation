import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join("/");
  const url = new URL(req.url);
  const backendUrl = `${BACKEND_URL}/api/${path}${url.search}`;

  // Get Auth0 access token
  let token: string | undefined;
  try {
    const tokenRes = await auth0.getAccessToken();
    token = tokenRes?.accessToken;
  } catch (error) {
    // Development bypass or not logged in
  }

  // Clone headers
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (process.env.BYPASS_AUTH === "true" && process.env.NODE_ENV === "development") {
    // Send a dummy authorization header to satisfy requireAuth when bypassed
    headers.set("Authorization", "Bearer mock-dev-token");
  }

  const reqInit: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      reqInit.body = await req.text();
    } catch (e) {
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
      // Avoid forwarding content encoding chunking that Next.js handles
      if (key !== "content-encoding" && key !== "transfer-encoding") {
        responseHeaders.set(key, val);
      }
    });

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
