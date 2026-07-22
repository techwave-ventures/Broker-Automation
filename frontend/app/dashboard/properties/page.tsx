"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, SlidersHorizontal, MapPin, Bed, Bath, IndianRupee, MoreVertical, Edit2, CheckCircle2, ShieldOff, EyeOff, Eye, Trash2, X } from "lucide-react";
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
    const [filter, setFilter] = useState("All Active");

    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{ type: "Sold" | "Rented" | "Hide" | "Republish" | "Delete", propertyId: string } | null>(null);
    const [toast, setToast] = useState<{ msg: string, type: "success" | "error" } | null>(null);

    const refresh = async () => {
        const props = await getProperties();
        setProperties(props);
    };

    useEffect(() => {
        refresh();
    }, []);

    const types = ["All Active", "Sold", "Rented", "Hidden", "Apartment / Flat", "Villa", "Office", "Commercial Plot"];

    const filtered = properties.filter((p) => {
        const matchSearch =
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.locality.toLowerCase().includes(search.toLowerCase()) ||
            p.city.toLowerCase().includes(search.toLowerCase());

        let matchFilter = false;

        if (filter === "All Active") {
            matchFilter = p.status === "Available";
        } else if (["Sold", "Rented", "Hidden"].includes(filter)) {
            matchFilter = p.status === filter;
        } else {
            // Type filters only show Available properties of that type
            matchFilter = p.status === "Available" && p.type.includes(filter);
        }

        return matchSearch && matchFilter;
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

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
                    <p className="text-foreground/60 text-sm mt-1">
                        Manage your property listings
                    </p>
                </div>
                <Link
                    href="/dashboard/properties/add"
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-105 w-fit shadow-md shadow-primary/20"
                >
                    <Plus className="h-4 w-4" />
                    Add Property
                </Link>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
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
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <SlidersHorizontal className="h-4 w-4 text-foreground/40 flex-shrink-0" />
                    {types.map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === t
                                ? "bg-primary text-primary-foreground shadow-sm bg-blue-600"
                                : "bg-card border border-border text-foreground/70 hover:border-primary/50"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((property) => (
                    <div
                        key={property.id}
                        className="bg-card border border-border rounded-2xl border-b-4 border-b-transparent hover:border-b-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all group block relative"
                    >
                        {/* Image linked */}
                        <Link href={`/dashboard/properties/${property.id}`}>
                            <div className="relative h-48 overflow-hidden rounded-t-2xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={property.image}
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
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                            )}
                            <button
                                onClick={(e) => { e.preventDefault(); setMenuOpenId(menuOpenId === property.id ? null : property.id) }}
                                className="h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted shadow-sm transition-all focus:outline-none"
                            >
                                <MoreVertical className="h-4 w-4 text-foreground/70" />
                            </button>

                            {/* Dropdown Menu */}
                            {menuOpenId === property.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-30 py-1.5 animate-in slide-in-from-top-2 fade-in">
                                    <Link href={`/dashboard/properties/add`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left">
                                        <Edit2 className="h-4 w-4 text-foreground/50" /> Edit Property
                                    </Link>

                                    {property.status !== "Sold" && property.transactionType === "Sell" && (
                                        <button onClick={() => setDialog({ type: 'Sold', propertyId: property.id })} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left text-red-600">
                                            <CheckCircle2 className="h-4 w-4" /> Mark as Sold
                                        </button>
                                    )}

                                    {property.status !== "Rented" && property.transactionType === "Rent" && (
                                        <button onClick={() => setDialog({ type: 'Rented', propertyId: property.id })} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left text-blue-600">
                                            <CheckCircle2 className="h-4 w-4" /> Mark as Rented
                                        </button>
                                    )}

                                    {property.status !== "Hidden" ? (
                                        <button onClick={() => setDialog({ type: 'Hide', propertyId: property.id })} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left">
                                            <EyeOff className="h-4 w-4 text-foreground/50" /> Hide Listing
                                        </button>
                                    ) : (
                                        <button onClick={() => setDialog({ type: 'Republish', propertyId: property.id })} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted font-medium w-full text-left text-emerald-600">
                                            <Eye className="h-4 w-4" /> Publish Again
                                        </button>
                                    )}

                                    <div className="h-px w-full bg-border my-1.5" />

                                    <button onClick={() => setDialog({ type: 'Delete', propertyId: property.id })} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/10 hover:text-red-600 font-medium w-full text-left text-red-500 transition-colors">
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
                ))}

                {filtered.length === 0 && (
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
