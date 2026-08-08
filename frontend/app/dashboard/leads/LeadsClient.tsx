"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, Filter, PlusCircle, RefreshCw, Users, SlidersHorizontal, Building2 } from "lucide-react";
import { HeaderSetter } from "@/components/layout/HeaderContext";
import { LeadsStats } from "./LeadsStats";
import { LeadCard, type Lead } from "./LeadCard";
import { LeadModal, type LeadFormData } from "./LeadModal";
import {
  createLeadApi,
  updateLeadApi,
  deleteLeadApi,
} from "@/lib/api";
import { getProperties, type Property } from "@/lib/properties";

interface Props {
  initialLeads: Lead[];
}

const STATUSES = [
  "All",
  "Upcoming Visit",
  "Browsing (No Visit)",
  "Visited",
  "Negotiating",
  "Closed",
  "Lost (Not Interested)",
] as const;

const CATEGORIES = [
  "All",
  "Residential",
  "Commercial",
  "Land",
] as const;

// Skeleton card shown while loading
function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-muted" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3 w-28 sm:w-36 rounded bg-muted" />
          <div className="h-3 w-20 sm:w-24 rounded bg-muted" />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="h-7 w-20 sm:w-24 rounded-xl bg-muted" />
          <div className="h-4 w-4 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// Confirm delete popover
function DeleteConfirm({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Users className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-center">Delete Lead?</h3>
        <p className="text-sm text-foreground/60 text-center mt-1">
          Remove <strong>{lead.customerName}</strong> from your pipeline? This cannot be undone.
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeadsClient({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch properties for modal dropdown once
  useEffect(() => {
    getProperties().then(setProperties);
  }, []);

  // Poll for new leads every 10 seconds
  const fetchLeads = useCallback(async (quiet = true) => {
    if (!quiet) setRefreshing(true);
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data: Lead[] = await res.json();
        setLeads(data);
      }
    } catch {
      // silent
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchLeads(true), 10000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  // ── Filtering (client-side on the fetched full list) ──────────────────────
  const filtered = leads.filter((l) => {
    const matchSearch =
      search === "" ||
      l.customerName.toLowerCase().includes(search.toLowerCase()) ||
      l.customerPhone.includes(search);
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const matchCategory = categoryFilter === "All" || l.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleCreate = async (data: Parameters<typeof createLeadApi>[0]) => {
    const newLead = await createLeadApi(data);
    setLeads((prev) => [newLead, ...prev]);
    showToast("Lead added successfully");
  };

  const handleUpdate = async (data: Parameters<typeof updateLeadApi>[1]) => {
    if (!editingLead) return;
    const updated = await updateLeadApi(editingLead.key, data);
    setLeads((prev) => prev.map((l) => (l.key === updated.key ? updated : l)));
    showToast("Lead updated");
  };

  const handleStatusChange = async (id: string, status: Lead["status"]) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.key === id ? { ...l, status } : l))
    );
    try {
      await updateLeadApi(id, { status });
    } catch {
      // Revert on failure
      await fetchLeads(true);
      showToast("Failed to update status", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLeadApi(deleteTarget.key);
      setLeads((prev) => prev.filter((l) => l.key !== deleteTarget.key));
      showToast("Lead removed");
    } catch {
      showToast("Failed to delete lead", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setModalMode("edit");
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingLead(null);
    setModalMode("create");
    setModalOpen(true);
  };

  // Map lead to form initial values
  const editInitial: Partial<LeadFormData> | undefined = useMemo(() => editingLead
    ? {
      customerName: editingLead.customerName,
      customerPhone: editingLead.customerPhone,
      category: editingLead.category || "",
      requestedLocality: editingLead.requestedLocality || "",
      budget: editingLead.budget || "",
      otherReqs: editingLead.otherReqs || "",
      interestedPropertyId: "",
      appointmentDate: "",
      status: editingLead.status,
      leadScore: editingLead.leadScore,
    }
    : undefined, [editingLead]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        <HeaderSetter
          title="Leads"
          subtitle="Manage your leads."
          actions={
            <>
              <button
                onClick={() => fetchLeads(false)}
                disabled={refreshing}
                className="h-9 w-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={openCreate}
                className="flex items-center justify-center h-9 w-9 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-4 sm:py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                title="Add Lead"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Add Lead</span>
              </button>
            </>
          }
        />

        {/* Stats */}
        <LeadsStats leads={leads} />

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Search row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/35" />
              <input
                id="leads-search"
                type="text"
                placeholder="Search name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`sm:hidden h-10 w-10 rounded-xl border flex items-center justify-center transition-colors flex-shrink-0 ${filterOpen || statusFilter !== "All" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground/60"}`}
              title="Filter by status"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Status chips — always visible on sm+, toggle on mobile */}
          <div className={`${filterOpen ? "flex" : "hidden"} sm:flex items-center gap-2 flex-wrap`}>
            <Filter className="h-4 w-4 text-foreground/35 flex-shrink-0" />
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setFilterOpen(false); }}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-foreground/60 hover:border-primary/40"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Category chips — always visible on sm+, toggle on mobile */}
          <div className={`${filterOpen ? "flex" : "hidden"} sm:flex items-center gap-2 flex-wrap mt-1`}>
            <Building2 className="h-4 w-4 text-foreground/35 flex-shrink-0" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setFilterOpen(false); }}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${categoryFilter === cat
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "bg-card border border-border text-foreground/60 hover:border-primary/40"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lead count */}
        {(search || statusFilter !== "All" || categoryFilter !== "All") && (
          <p className="text-xs text-foreground/45">
            Showing <strong>{filtered.length}</strong> of {leads.length} leads
          </p>
        )}

        {/* Lead list */}
        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-foreground/35 bg-card rounded-3xl border border-dashed border-border px-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-7 w-7 sm:h-8 sm:w-8 opacity-40" />
              </div>
              <p className="font-semibold text-sm sm:text-base text-center">
                {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
              </p>
              <p className="text-xs sm:text-sm mt-1 text-center max-w-xs">
                {leads.length === 0
                  ? "Add a lead manually or wait for the Roofiyo Bot to capture one."
                  : "Try a different search or filter."}
              </p>
              {leads.length === 0 && (
                <button
                  onClick={openCreate}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add First Lead
                </button>
              )}
            </div>
          ) : (
            filtered.map((lead, i) => (
              <LeadCard
                key={lead.key}
                lead={lead}
                animIndex={i}
                onEdit={openEdit}
                onDelete={(l) => setDeleteTarget(l)}
                onStatusChange={handleStatusChange}
                properties={properties}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={modalMode === "create" ? handleCreate : handleUpdate}
        initial={editInitial}
        properties={properties}
        mode={modalMode}
      />

      {deleteTarget && (
        <DeleteConfirm
          lead={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast — safe-area aware */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border transition-all animate-fade-in-up max-w-[calc(100vw-2rem)] ${toast.type === "success"
            ? "bg-accent/10 text-accent border-accent/20"
            : "bg-red-500/10 text-red-600 border-red-500/20"
            }`}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}
