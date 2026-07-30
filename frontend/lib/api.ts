import type { Property } from "./properties";

const BACKEND_URL = process.env.BACKEND_URL;

async function safeJsonParse(res: Response) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("Failed to parse JSON response:", e);
    return null;
  }
}

export async function getAuthHeaders() {
  let cookieHeader = "";
  if (typeof window === "undefined") {
    try {
      const { headers } = await import("next/headers");
      const nextHeaders = await headers();
      cookieHeader = nextHeaders.get("cookie") || "";
    } catch {
      // Ignore in client side
    }
  }

  return {
    "Content-Type": "application/json",
    ...(cookieHeader ? { "cookie": cookieHeader } : {}),
  };
}

export async function getSessionUser() {
  try {
    let cookieHeader = "";
    if (typeof window === "undefined") {
      try {
        const { headers } = await import("next/headers");
        const nextHeaders = await headers();
        cookieHeader = nextHeaders.get("cookie") || "";
      } catch {
        // Ignore in client side
      }
    }

    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        ...(cookieHeader ? { "cookie": cookieHeader } : {}),
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;
    const data = await safeJsonParse(res);
    return data?.user || null;
  } catch (error) {
    console.error("Failed to get session user:", error);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendPropertyToFrontend(p: any): Property {
  return {
    id: String(p.key),
    title: p.title,
    description: p.description || "",
    transactionType: p.transaction_type,
    expectedPrice: p.expected_price ? Number(p.expected_price) : undefined,
    negotiable: p.negotiable,
    monthlyRent: p.monthly_rent ? Number(p.monthly_rent) : undefined,
    securityDeposit: p.security_deposit ? Number(p.security_deposit) : undefined,
    availableFrom: p.available_from,
    category: p.category,
    type: p.type,
    city: p.city,
    locality: p.locality,
    fullAddress: p.full_address,
    image: p.image || "",
    images: p.images || [],
    builtUpArea: p.built_up_area ? Number(p.built_up_area) : undefined,
    plotArea: p.plot_area ? Number(p.plot_area) : undefined,
    furnishing: p.furnishing,
    parking: p.parking === "Yes" || p.parking === "true" || p.parking === true,
    status: p.status,
    beds: p.beds ? Number(p.beds) : undefined,
    baths: p.baths ? Number(p.baths) : undefined,
    propertyAge: p.property_age,
    readyToMove: p.ready_to_move,
    floorNumber: p.floor_number,
    totalFloors: p.total_floors,
    garden: p.garden,
    washrooms: p.washrooms ? Number(p.washrooms) : undefined,
    plotWidth: p.plot_width ? Number(p.plot_width) : undefined,
    plotLength: p.plot_length ? Number(p.plot_length) : undefined,
    cornerPlot: p.corner_plot,
    amenities: p.amenities || [],
    otherAmenities: p.other_amenities || [],
    agent_name: p.agent_name,
    agent_phone: p.agent_phone,
    slug: p.slug,
    shortCode: p.short_code,
  };
}

export async function fetchProperties(): Promise<Property[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/properties`, { headers, next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await safeJsonParse(res);
    return Array.isArray(data) ? data.map(mapBackendPropertyToFrontend) : [];
  } catch (error) {
    console.error("Failed to fetch properties from backend:", error);
    return [];
  }
}

export async function fetchLeads() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/leads`, { headers, next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await safeJsonParse(res);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch leads from backend:", error);
    return [];
  }
}

export async function fetchChats() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/chats`, { headers, next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await safeJsonParse(res);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch chats from backend:", error);
    return [];
  }
}

export async function fetchWabas() {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/auth/waba`, { headers, next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await safeJsonParse(res);
    return data?.wabas || [];
  } catch (error) {
    console.error("Failed to fetch WABAs from backend:", error);
    return [];
  }
}

export async function fetchTemplates(wabaId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/paid_messaging/templates/all?waba_id=${wabaId}`, { headers, next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await safeJsonParse(res);
    return data?.templates || [];
  } catch (error) {
    console.error("Failed to fetch templates from backend:", error);
    return [];
  }
}

// ─── Client-side Leads CRUD (used from "use client" components) ──────────────

export interface LeadPayload {
  customerName: string;
  customerPhone: string;
  requestedLocality?: string;
  budget?: string;
  otherReqs?: string;
  interestedPropertyId?: string;
  appointmentDate?: string | null;
  status?: "Upcoming Visit" | "Visited" | "Negotiating" | "Browsing (No Visit)" | "Closed";
  leadScore?: "High" | "Medium" | "Low";
}

export async function createLeadApi(data: LeadPayload) {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to create lead");
  }
  return res.json();
}

export async function updateLeadApi(id: string, data: Partial<LeadPayload>) {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to update lead");
  }
  return res.json();
}

export async function deleteLeadApi(id: string) {
  const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete lead");
  }
  return res.json();
}

// Minimal property info for dropdowns
export interface PropertyOption {
  id: string;
  title: string;
  locality: string;
}

export interface AnalyticsData {
  kpis: {
    totalLeads: { value: number; change: string; up: boolean };
    qualifiedLeads: { value: number; change: string; up: boolean };
    totalConversations: { value: number; change: string; up: boolean };
    viewingsScheduled: { value: number; change: string; up: boolean };
  };
  weeklyData: { day: string; leads: number; conversations: number }[];
  topProperties: { name: string; leads: number; conv: number; rate: string }[];
}

export async function fetchAnalytics(): Promise<AnalyticsData | null> {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPropertiesMinimal(): Promise<PropertyOption[]> {
  try {
    const res = await fetch("/api/properties");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((p: { key: string | number; title: string; locality: string }) => ({
        id: String(p.key),
        title: p.title,
        locality: p.locality,
      }))
      : [];
  } catch {
    return [];
  }
}

