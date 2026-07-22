import type { Property } from "./properties";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

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
    image: p.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=80",
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
