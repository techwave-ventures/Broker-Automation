import { NextResponse } from 'next/server';

export async function GET() {
  // Return the private BACKEND_URL server-side variable to the client
  return NextResponse.json({
    backendUrl: process.env.BACKEND_URL
  });
}
