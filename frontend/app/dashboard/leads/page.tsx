import { fetchLeads } from "@/lib/api";
import { LeadsClient } from "./LeadsClient";
import type { Lead } from "./LeadCard";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  // Fetch real leads server-side for the initial render (no flash of empty state)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchLeads();
  const leads: Lead[] = raw.map((l: any) => ({
    key: String(l.key),
    customerName: l.customerName,
    customerPhone: l.customerPhone,
    requestedLocality: l.requestedLocality || undefined,
    budget: l.budget || undefined,
    otherReqs: l.otherReqs || undefined,
    interestedPropertyId: l.interestedPropertyId || undefined,
    interestedPropertyTitle: l.interestedPropertyTitle || null,
    appointmentDate: l.appointmentDate || null,
    status: l.status,
    leadScore: l.leadScore,
  }));

  return <LeadsClient initialLeads={leads} />;
}
