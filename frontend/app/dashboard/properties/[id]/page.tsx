"use client";

import {
    ArrowLeft,
    MapPin,
    BedDouble,
    Bath,
    IndianRupee,
    Share2,
    Heart,
    Phone,
    MessageSquare,
    Building2,
    Calendar,
    CheckCircle2,
    Map,
    Car,
    Wind,
    Maximize,
    ArrowRight,
    X,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPropertyById, Property, getPropertyShareUrl } from "@/lib/properties";

const formatPrice = (p: number | undefined) => {
    if (!p) return "Price on Request";
    if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
    if (p >= 100000) return `₹${(p / 100000).toFixed(2)} L`;
    return `₹${p.toLocaleString()}`;
};

export default function PropertyDetailPage() {
    const params = useParams();
    const id = params?.id as string;

    const [property, setProperty] = useState<Property | null | undefined>(undefined);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            const prop = await getPropertyById(id);
            setProperty(prop || null);
        };
        load();
    }, [id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!lightboxOpen) return;
            if (e.key === "Escape") setLightboxOpen(false);
            if (e.key === "ArrowLeft") setCurrentIndex(prev => prev > 0 ? prev - 1 : gallery.length - 1);
            if (e.key === "ArrowRight") setCurrentIndex(prev => prev < gallery.length - 1 ? prev + 1 : 0);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    if (property === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-foreground/50 font-medium animate-pulse">Loading property details...</p>
                </div>
            </div>
        );
    }

    if (property === null) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-2">
                    <Building2 className="h-8 w-8 text-foreground/30" />
                </div>
                <h1 className="text-2xl font-bold">Property Not Found</h1>
                <p className="text-foreground/50 max-w-sm">The property you are looking for has been removed or does not exist.</p>
                <Link href="/dashboard/properties" className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-transform active:scale-95">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const gallery = [
        property.image,
        ...(property.images && property.images.length > 0 ? property.images : [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
            "https://images.unsplash.com/photo-1600566753086-00f18efc2291?w=800&q=80",
            "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"
        ])
    ].filter(Boolean);

    const priceToDisplay = property.transactionType === "Sell" ? property.expectedPrice : property.monthlyRent;
    const isRent = property.transactionType === "Rent";

    const handleShare = () => {
        const shareUrl = getPropertyShareUrl(property);
        navigator.clipboard.writeText(shareUrl);
        setToast("Descriptive property link copied to clipboard!");
        setTimeout(() => setToast(null), 3000);
    };

    const handleWhatsAppChat = () => {
        const agentPhone = property.agent_phone || "";
        const shareUrl = getPropertyShareUrl(property);
        const whatsappMsg = encodeURIComponent(`Hi, I am interested in your property listing: "${property.title}" in ${property.locality}, ${property.city}.\n\nLink: ${shareUrl}`);
        window.open(`https://wa.me/${agentPhone.replace(/[^0-9]/g, "")}?text=${whatsappMsg}`, "_blank");
    };

    return (
        <div className="pb-24 lg:pb-12 bg-background relative">
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in bg-card text-foreground px-4 py-3 rounded-xl shadow-xl border border-primary/20 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="font-semibold text-sm">{toast}</span>
                </div>
            )}
            {/* ── Top Navigation Bar ── */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/dashboard/properties" className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        Back to Hub
                    </Link>

                    <div className="flex items-center gap-2">
                        <button onClick={handleShare} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-foreground/10 transition-colors">
                            <Share2 className="h-4 w-4 text-foreground/70" />
                        </button>
                        <button className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors group">
                            <Heart className="h-4 w-4 text-foreground/70 group-hover:text-red-500 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">



                {/* ── Seamless Image Gallery ── */}
                <div className="mb-10">
                    <div
                        className="relative h-[300px] sm:h-[450px] lg:h-[550px] w-full rounded-[2rem] overflow-hidden cursor-pointer group shadow-sm bg-muted"
                        onClick={() => setLightboxOpen(true)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={gallery[currentIndex]}
                            alt={property.title}
                            className="w-full h-full object-cover transition-opacity duration-300"
                        />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-5 left-5 bg-background/80 backdrop-blur-lg text-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border border-border shadow-sm transform transition-all group-hover:scale-105">
                            <Maximize className="h-4 w-4" /> View Fullscreen
                        </div>
                        <div className="absolute top-5 right-5 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider">
                            {currentIndex + 1} / {gallery.length} Images
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x pt-1 px-1">
                        {gallery.map((img, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`relative h-20 w-28 sm:h-24 sm:w-36 rounded-2xl overflow-hidden flex-shrink-0 snap-center transition-all transform hover:scale-105 active:scale-95 ${currentIndex === i ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img}
                                    alt={`Thumbnail ${i + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Header Title Area ── */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md ${property.transactionType === 'Sell' ? 'bg-blue-500/15 text-blue-500' : 'bg-orange-500/15 text-orange-500'
                                }`}>
                                For {property.transactionType}
                            </span>
                            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-foreground/10 text-foreground/70">
                                {property.type}
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3">
                            {property.title}
                        </h1>
                        <p className="text-foreground/60 flex items-center gap-1.5 text-sm sm:text-base font-medium">
                            <MapPin className="h-4 w-4 text-primary" /> {property.fullAddress}
                        </p>
                    </div>

                    <div className="lg:text-right flex flex-col items-end">
                        <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider mb-1">
                            Asking Price
                        </p>
                        <p className="text-4xl sm:text-5xl font-extrabold text-primary flex items-center tracking-tight">
                            {formatPrice(priceToDisplay)}
                            {isRent && <span className="text-lg text-foreground/40 font-medium ml-1">/mo</span>}
                        </p>
                    </div>
                </div>

                {/* ── Main Content Grid ── */}
                <div className="grid lg:grid-cols-3 gap-10">

                    {/* Left Column (Details) */}
                    <div className="lg:col-span-2 space-y-10">

                        {/* Quick Stats Banner */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-6 bg-card border border-border p-4 sm:p-6 rounded-3xl shadow-sm">
                            {(property.beds ?? 0) > 0 && (
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <BedDouble className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold leading-none">{property.beds}</p>
                                        <p className="text-xs font-medium text-foreground/50 mt-1">Beds</p>
                                    </div>
                                </div>
                            )}
                            {(property.baths ?? 0) > 0 && (
                                <div className="flex items-center gap-3 border-l border-border pl-2 sm:pl-6">
                                    <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                        <Bath className="h-6 w-6 text-cyan-500" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold leading-none">{property.baths}</p>
                                        <p className="text-xs font-medium text-foreground/50 mt-1">Baths</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 border-l border-border pl-2 sm:pl-6">
                                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <Maximize className="h-6 w-6 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold leading-none">{property.builtUpArea || property.plotArea || 0}</p>
                                    <p className="text-xs font-medium text-foreground/50 mt-1">Sq Ft</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                            <h2 className="text-xl font-bold mb-4">About this property</h2>
                            <p className="text-foreground/70 leading-relaxed whitespace-pre-wrap">
                                {property.description}
                            </p>
                        </div>

                        <hr className="border-border" />

                        {/* Specs Grid */}
                        <div>
                            <h2 className="text-xl font-bold mb-6">Property Overview</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">

                                {[
                                    { label: "Status", value: property.status, icon: CheckCircle2 },
                                    { label: "Furnishing", value: property.furnishing, icon: Wind },
                                    { label: "Parking", value: property.parking ? "Available" : "No", icon: Car },
                                    { label: "Ready to Move", value: property.readyToMove ? "Yes" : "No", icon: Calendar },
                                    { label: "Plot Dimensions", value: property.plotLength ? `${property.plotLength} x ${property.plotWidth} ft` : null, icon: Map },
                                    { label: "Floor", value: property.floorNumber ? `${property.floorNumber} / ${property.totalFloors}` : null, icon: Building2 },
                                    { label: "Washrooms", value: property.washrooms, icon: Bath },
                                ].filter(x => x.value).map((stat, i) => (
                                    <div key={i} className="flex flex-col">
                                        <span className="flex items-center gap-1.5 text-sm text-foreground/50 mb-1">
                                            <stat.icon className="h-3.5 w-3.5" />
                                            {stat.label}
                                        </span>
                                        <span className="font-semibold">{stat.value}</span>
                                    </div>
                                ))}

                            </div>
                        </div>

                        <hr className="border-border" />

                        {/* Amenities Section */}
                        {property.amenities.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-6">Amenities & Features</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {property.amenities.map(am => (
                                        <div key={am} className="flex items-center gap-3 bg-card border border-border px-4 py-3 rounded-xl shadow-sm">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                            <span className="text-sm font-medium">{am}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Right Column (Action Sidebar) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-card border border-border shadow-xl rounded-3xl p-6 overflow-hidden relative">
                            {/* Decorative top blur */}
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                            <h3 className="text-lg font-bold mb-1 relative z-10">Interested in this property?</h3>
                            <p className="text-sm text-foreground/60 mb-6 relative z-10">Our AI agent is online and ready to answer any questions or book a viewing.</p>

                            <div className="space-y-3 relative z-10">
                                <button onClick={handleWhatsAppChat} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0">
                                    <MessageSquare className="h-5 w-5" />
                                    Chat on WhatsApp
                                </button>
                                <button className="w-full h-14 bg-background border-2 border-primary text-primary font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                                    <Calendar className="h-5 w-5" />
                                    Schedule Viewing
                                </button>
                                {property.agent_phone ? (
                                    <a href={`tel:${property.agent_phone}`} className="w-full h-12 text-foreground/70 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-muted transition-colors border border-border">
                                        <Phone className="h-4 w-4" />
                                        Call Agent ({property.agent_phone})
                                    </a>
                                ) : (
                                    <button className="w-full h-12 text-foreground/70 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-muted transition-colors">
                                        <Phone className="h-4 w-4" />
                                        Request Callback
                                    </button>
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-border relative z-10">
                                <p className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-4">Listed By Agent</p>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-0.5 flex-shrink-0">
                                        <div className="h-full w-full rounded-full bg-card border-2 border-background flex items-center justify-center text-foreground font-bold text-sm">
                                            {property.agent_name ? property.agent_name.split(' ').map(n => n[0]).join('').toUpperCase() : "VA"}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground">{property.agent_name || "Vishal Auti"}</p>
                                        {property.agent_phone && (
                                            <p className="text-xs text-foreground/60 flex items-center gap-1 mt-0.5">
                                                <Phone className="h-3 w-3 text-primary" /> {property.agent_phone}
                                            </p>
                                        )}
                                        <p className="text-xs text-foreground/40">Sunrise Realty Group</p>
                                    </div>
                                </div>
                                <Link href="/dashboard/leads" className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                                    View all listings by agent <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
                    <div className="absolute top-6 right-6 z-50 text-white flex gap-4 items-center">
                        <span className="text-sm font-bold opacity-70 tracking-wider bg-white/10 px-3 py-1 rounded-full">{currentIndex + 1} / {gallery.length}</span>
                        <button onClick={() => setLightboxOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev > 0 ? prev - 1 : gallery.length - 1); }}
                        className="absolute left-2 sm:left-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
                    >
                        <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>

                    <div className="w-full max-w-6xl h-full p-4 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={gallery[currentIndex]}
                            alt={`${property.title} Fullscreen`}
                            className="max-w-full max-h-[85vh] object-contain select-none"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev < gallery.length - 1 ? prev + 1 : 0); }}
                        className="absolute right-2 sm:right-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
                    >
                        <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>
                </div>
            )}
        </div>
    );
}
