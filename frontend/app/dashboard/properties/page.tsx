"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, SlidersHorizontal, MapPin, Bed, Bath, IndianRupee, MoreVertical, Edit2, CheckCircle2, ShieldOff, EyeOff, Eye, Trash2, X } from "lucide-react";
import { HeaderSetter } from "@/components/layout/HeaderContext";
import { useState, useEffect } from "react";
import { getProperties, Property, updatePropertyStatus, deleteProperty } from "@/lib/properties";

const formatPrice = (p: number | undefined, t: string) => {
    if (!p) return "Price on Request";
    let base = "";
    if (p >= 10000000) base = `₹${(p / 10000000).toFixed(2)} Cr`;
    else if (p >= 100000) base = `₹${(p / 100000).toFixed(2)} L`;
    else base = `₹${p.toLocaleString()}`;

    return t === "Rent" ? `${base} / mo` : base;
};

const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
        case "available": return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 shadow-sm flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available</span>;
        case "sold": return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 border border-red-500/20 shadow-sm flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Sold</span>;
        case "rented": return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/20 shadow-sm flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Rented</span>;
        case "hidden": return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-foreground/10 text-foreground/60 border border-border shadow-sm flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-foreground/40" /> Hidden</span>;
        default: return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-accent text-accent-foreground">{status}</span>;
    }
}

export default function PropertiesPage() {
    const router = useRouter();
    const [properties, setProperties] = useState<Property[]>([]);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        status: "Available",
        transactionType: "All",
        category: "All",
        type: "All",
    });
    const [filterOpen, setFilterOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{ type: "Sold" | "Rented" | "Hide" | "Republish" | "Delete", propertyId: string } | null>(null);
    const [toast, setToast] = useState<{ msg: string, type: "success" | "error" } | null>(null);

    const refresh = async () => {
        setIsLoading(true);
        try {
            const props = await getProperties();
            setProperties(props);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const getTypeOptions = () => {
        const category = filters.category;
        if (category === "Residential") return ["Apartment / Flat", "Villa", "Bungalow", "Independent House"];
        if (category === "Commercial") return ["Office", "Shop", "Warehouse", "Showroom"];
        if (category === "Land") return ["Residential Plot", "Commercial Plot", "Agricultural Land"];
        return [
            "Apartment / Flat", "Villa", "Bungalow", "Independent House",
            "Office", "Shop", "Warehouse", "Showroom",
            "Residential Plot", "Commercial Plot", "Agricultural Land"
        ];
    };

    const filtered = properties.filter((p) => {
        const matchSearch =
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.locality.toLowerCase().includes(search.toLowerCase()) ||
            p.city.toLowerCase().includes(search.toLowerCase());

        const matchStatus = filters.status === "All" || p.status.toLowerCase() === filters.status.toLowerCase();
        const matchTxType = filters.transactionType === "All" || p.transactionType.toLowerCase() === filters.transactionType.toLowerCase();
        const matchCategory = filters.category === "All" || p.category?.toLowerCase() === filters.category.toLowerCase();
        const matchType = filters.type === "All" || p.type?.toLowerCase() === filters.type.toLowerCase();

        return matchSearch && matchStatus && matchTxType && matchCategory && matchType;
    });

    const triggerToast = (msg: string) => {
        setToast({ msg, type: "success" });
        setTimeout(() => setToast(null), 3000);
    }

    const confirmAction = async () => {
        if (!dialog) return;
        const { type, propertyId } = dialog;

        try {
            if (type === "Sold") await updatePropertyStatus(propertyId, "Sold");
            else if (type === "Rented") await updatePropertyStatus(propertyId, "Rented");
            else if (type === "Hide") await updatePropertyStatus(propertyId, "Hidden");
            else if (type === "Republish") await updatePropertyStatus(propertyId, "Available");
            else if (type === "Delete") await deleteProperty(propertyId);
        } catch (e) {
            console.error("Action failed:", e);
        }

        setDialog(null);
        await refresh();
        setMenuOpenId(null);

        triggerToast(`Property ${type === "Delete" ? "deleted" : `marked as ${type}`} successfully.`);
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 relative min-h-[80vh]">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in bg-card text-foreground px-4 py-3 rounded-xl shadow-xl border border-primary/20 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="font-semibold text-sm">{toast.msg}</span>
                </div>
            )}

            {/* Dialog Modal */}
            {dialog && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                {dialog.type === "Delete" ? "Delete Property?" :
                                    dialog.type === "Hide" ? "Hide Listing?" :
                                        dialog.type === "Republish" ? "Republish Property?" :
                                            `Mark this property as ${dialog.type}?`}
                            </h2>
                            <button onClick={() => setDialog(null)} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-foreground/70 mb-8 text-sm leading-relaxed">
                            {dialog.type === "Sold" && "This property will no longer appear in search results and interested buyers won't be able to contact you."}
                            {dialog.type === "Rented" && "This property will no longer appear for rent and will be hidden from all users."}
                            {dialog.type === "Hide" && "Property becomes invisible to all users. You can publish it again later with one click."}
                            {dialog.type === "Republish" && "This will make your property visible in public search results again."}
                            {dialog.type === "Delete" && "This action cannot be undone. The property and all associated images will be permanently deleted."}
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setDialog(null)} className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmAction} className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-transform active:scale-95 ${dialog.type === "Delete" ? "bg-red-500 hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)]" : "bg-primary hover:bg-primary/90 shadow-[0_4px_15px_rgba(37,99,235,0.3)]"}`}>
                                {dialog.type === "Delete" ? "Delete" : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <HeaderSetter
                title="Properties"
                subtitle="Manage your property listings"
                actions={
                    <Link
                        href="/dashboard/properties/add"
                        className="flex items-center justify-center h-9 w-9 sm:h-auto sm:w-auto sm:gap-2 bg-primary text-primary-foreground sm:px-4 sm:py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-md shadow-primary/20"
                        title="Add Property"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Property</span>
                    </Link>
                }
            />

            {/* Search & Filter */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search by name or location..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setFilterOpen(!filterOpen)}
                        className={`h-10 px-4 rounded-xl border flex items-center gap-2 text-sm font-semibold transition-colors flex-shrink-0 ${filterOpen || (filters.status !== "Available" || filters.transactionType !== "All" || filters.category !== "All" || filters.type !== "All")
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border text-foreground/75 hover:bg-muted"
                            }`}
                        title="Toggle filters"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>

                {/* Collapsible Filter Panel (Dropdowns) */}
                {filterOpen && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/10 border border-border rounded-xl p-4 animate-in slide-in-from-top-2 fade-in">
                        {/* Status Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, type: "All" }))}
                                className="w-full h-9 px-3 rounded-lg bg-card border border-border text-xs font-semibold focus:outline-none"
                            >
                                <option value="Available">Available</option>
                                <option value="Sold">Sold</option>
                                <option value="Rented">Rented</option>
                                <option value="Hidden">Hidden</option>
                                <option value="All">All Statuses</option>
                            </select>
                        </div>

                        {/* Transaction Type Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">Transaction</label>
                            <select
                                value={filters.transactionType}
                                onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value }))}
                                className="w-full h-9 px-3 rounded-lg bg-card border border-border text-xs font-semibold focus:outline-none"
                            >
                                <option value="All">All Transactions</option>
                                <option value="Sell">For Sell</option>
                                <option value="Rent">For Rent</option>
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, type: "All" }))}
                                className="w-full h-9 px-3 rounded-lg bg-card border border-border text-xs font-semibold focus:outline-none"
                            >
                                <option value="All">All Categories</option>
                                <option value="Residential">Residential</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Land">Land</option>
                            </select>
                        </div>

                        {/* Property Type Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">Property Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                className="w-full h-9 px-3 rounded-lg bg-card border border-border text-xs font-semibold focus:outline-none"
                            >
                                <option value="All">All Types</option>
                                {getTypeOptions().map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Only Show Active Filters below */}
                {(filters.status !== "Available" || filters.transactionType !== "All" || filters.category !== "All" || filters.type !== "All") && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-semibold text-foreground/50">Active Filters:</span>

                        {filters.status !== "Available" && (
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, status: "Available" }))}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold hover:bg-primary/20 transition-all animate-fade-in"
                                title="Clear status filter"
                            >
                                <span>Status: {filters.status}</span>
                                <X className="h-3 w-3" />
                            </button>
                        )}

                        {filters.transactionType !== "All" && (
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, transactionType: "All" }))}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold hover:bg-primary/20 transition-all animate-fade-in"
                                title="Clear transaction filter"
                            >
                                <span>Tx: {filters.transactionType}</span>
                                <X className="h-3 w-3" />
                            </button>
                        )}

                        {filters.category !== "All" && (
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, category: "All", type: "All" }))}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold hover:bg-primary/20 transition-all animate-fade-in"
                                title="Clear category filter"
                            >
                                <span>Category: {filters.category}</span>
                                <X className="h-3 w-3" />
                            </button>
                        )}

                        {filters.type !== "All" && (
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, type: "All" }))}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold hover:bg-primary/20 transition-all animate-fade-in"
                                title="Clear type filter"
                            >
                                <span>Type: {filters.type}</span>
                                <X className="h-3 w-3" />
                            </button>
                        )}

                        <button
                            onClick={() => setFilters({ status: "Available", transactionType: "All", category: "All", type: "All" })}
                            className="text-foreground/45 hover:text-primary font-bold underline transition-colors"
                        >
                            Reset All
                        </button>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl border-b-4 border-b-transparent relative">
                            <div className="relative h-48 overflow-hidden rounded-t-2xl bg-muted animate-pulse">
                                {/* Badges Skeleton */}
                                <div className="absolute top-3 left-3 h-6 w-20 bg-muted-foreground/20 rounded-full"></div>
                                <div className="absolute top-3 right-3 flex gap-1">
                                    <div className="h-6 w-16 bg-muted-foreground/20 rounded-full"></div>
                                    <div className="h-6 w-20 bg-muted-foreground/20 rounded-full"></div>
                                </div>
                            </div>

                            {/* Three dots skeleton */}
                            <div className="absolute top-[13.5rem] right-4 h-8 w-8 rounded-full bg-muted-foreground/10 animate-pulse border border-border z-20"></div>

                            <div className="block p-4 space-y-4">
                                <div className="space-y-2">
                                    {/* Title Skeleton */}
                                    <div className="h-5 bg-muted-foreground/10 rounded w-3/4 animate-pulse"></div>
                                    {/* Location Skeleton */}
                                    <div className="flex items-center gap-1 mt-1">
                                        <div className="h-3 w-3 bg-muted-foreground/10 rounded-full animate-pulse"></div>
                                        <div className="h-3 bg-muted-foreground/10 rounded w-1/2 animate-pulse"></div>
                                    </div>
                                </div>

                                {/* Info (Beds/Baths/Area) Skeleton */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3.5 w-3.5 bg-muted-foreground/10 rounded-full animate-pulse"></div>
                                        <div className="h-4 bg-muted-foreground/10 rounded w-12 animate-pulse"></div>
                                    </div>
                                    <div className="flex items-center gap-1.5 border-l border-border pl-3">
                                        <div className="h-3.5 w-3.5 bg-muted-foreground/10 rounded-full animate-pulse"></div>
                                        <div className="h-4 bg-muted-foreground/10 rounded w-12 animate-pulse"></div>
                                    </div>
                                    <div className="flex items-center gap-1.5 border-l border-border pl-3">
                                        <div className="h-4 bg-muted-foreground/10 rounded w-16 animate-pulse"></div>
                                    </div>
                                </div>

                                {/* Price Action Skeleton */}
                                <div className="flex items-center justify-between pt-3 border-t border-border">
                                    <div className="flex items-center gap-0.5">
                                        <div className="h-4 w-4 bg-muted-foreground/10 rounded-full animate-pulse"></div>
                                        <div className="h-6 bg-muted-foreground/10 rounded w-24 animate-pulse"></div>
                                    </div>
                                    <div className="h-7 bg-muted-foreground/10 rounded-lg w-14 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map((property) => (
                        <div
                            key={property.id}
                            className={`bg-card border border-border rounded-2xl border-b-4 border-b-transparent hover:border-b-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all group block relative ${menuOpenId === property.id ? "z-30" : "z-0"}`}
                        >
                            {/* Image linked */}
                            <Link href={`/dashboard/properties/${property.id}`}>
                                <div className="relative h-48 overflow-hidden rounded-t-2xl">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={property.image || undefined}
                                        alt={property.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute top-3 left-3">
                                        {getStatusBadge(property.status)}
                                    </div>
                                    <div className="absolute top-3 right-3 flex gap-1">
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-md shadow-sm border border-white/10">
                                            {property.transactionType}
                                        </span>
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-md shadow-sm border border-white/10">
                                            {property.type}
                                        </span>
                                    </div>
                                </div>
                            </Link>

                            {/* Three Dots Menu */}
                            <div className="absolute top-[13.5rem] right-4 z-20">
                                {/* Backdrop for closing popover easily */}
                                {menuOpenId === property.id && (
                                    <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(null); }} />
                                )}
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(menuOpenId === property.id ? null : property.id); }}
                                    className="h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted shadow-sm transition-all focus:outline-none relative z-20"
                                >
                                    <MoreVertical className="h-4 w-4 text-foreground/70" />
                                </button>

                                {/* Dropdown Menu */}
                                {menuOpenId === property.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-30 py-1.5 animate-in slide-in-from-top-2 fade-in">
                                        <Link href={`/dashboard/properties/edit/${property.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left">
                                            <Edit2 className="h-4 w-4 text-foreground/50" /> Edit Property
                                        </Link>

                                        {property.status !== "Sold" && property.transactionType === "Sell" && (
                                            <button onClick={(e) => { e.stopPropagation(); setDialog({ type: 'Sold', propertyId: property.id }); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left text-red-600">
                                                <CheckCircle2 className="h-4 w-4" /> Mark as Sold
                                            </button>
                                        )}

                                        {property.status !== "Rented" && property.transactionType === "Rent" && (
                                            <button onClick={(e) => { e.stopPropagation(); setDialog({ type: 'Rented', propertyId: property.id }); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left text-blue-600">
                                                <CheckCircle2 className="h-4 w-4" /> Mark as Rented
                                            </button>
                                        )}

                                        {property.status !== "Hidden" ? (
                                            <button onClick={(e) => { e.stopPropagation(); setDialog({ type: 'Hide', propertyId: property.id }); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left">
                                                <EyeOff className="h-4 w-4 text-foreground/50" /> Hide Listing
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); setDialog({ type: 'Republish', propertyId: property.id }); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left text-emerald-600">
                                                <Eye className="h-4 w-4" /> Publish Again
                                            </button>
                                        )}

                                        <div className="h-px w-full bg-border my-1.5" />

                                        <button onClick={(e) => { e.stopPropagation(); setDialog({ type: 'Delete', propertyId: property.id }); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/10 hover:text-red-600 font-medium w-full text-left text-red-500 transition-colors">
                                            <Trash2 className="h-4 w-4" /> Delete Property
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Info linked */}
                            <Link href={`/dashboard/properties/${property.id}`} className="block p-4">
                                <h3 className="font-semibold text-[15px] truncate group-hover:text-primary transition-colors">
                                    {property.title}
                                </h3>
                                <p className="text-xs text-foreground/60 flex items-center gap-1 mt-1 font-medium">
                                    <MapPin className="h-3 w-3" /> {property.locality}, {property.city}
                                </p>

                                <div className="flex items-center gap-3 mt-4 mb-1 text-xs text-foreground/60 font-medium">
                                    {property.beds ? (
                                        <span className="flex items-center gap-1.5">
                                            <Bed className="h-3.5 w-3.5" /> {property.beds} <span className="hidden xl:inline">Beds</span>
                                        </span>
                                    ) : null}
                                    {property.baths ? (
                                        <span className="flex items-center gap-1.5 border-l border-border pl-3">
                                            <Bath className="h-3.5 w-3.5" /> {property.baths} <span className="hidden xl:inline">Baths</span>
                                        </span>
                                    ) : null}
                                    {(property.builtUpArea || property.plotArea) ? (
                                        <span className={`flex items-center gap-1.5 ${(property.beds || property.baths) ? 'border-l border-border pl-3' : ''}`}>
                                            {property.builtUpArea || property.plotArea} sqft
                                        </span>
                                    ) : null}
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                                    <span className="font-extrabold text-primary flex items-center gap-0.5 text-base">
                                        <IndianRupee className="h-4 w-4 -mr-1" />
                                        {formatPrice(property.transactionType === "Sell" ? property.expectedPrice : property.monthlyRent, property.transactionType).replace("₹", "")}
                                    </span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary group-hover:bg-primary group-hover:text-white transition-all bg-primary/10 px-3 py-1.5 rounded-lg">
                                        View
                                    </span>
                                </div>
                            </Link>
                        </div>
                    ))
                ) : (
                    <div className="col-span-1 sm:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-20 text-foreground/40 bg-card rounded-3xl border border-dashed border-border">
                        <ShieldOff className="h-12 w-12 mb-3 opacity-30" />
                        <p className="font-medium">No properties found</p>
                        <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
