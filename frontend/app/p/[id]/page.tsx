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
    X,
    ChevronLeft,
    ChevronRight,
    BotMessageSquare
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPropertyById, Property } from "@/lib/properties";

const formatPrice = (p: number | undefined) => {
    if (!p) return "Price on Request";
    if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
    if (p >= 100000) return `₹${(p / 100000).toFixed(2)} L`;
    return `₹${p.toLocaleString()}`;
};

export default function PublicPropertyPage() {
    const params = useParams();
    const id = params?.id as string;

    const [property, setProperty] = useState<Property | null | undefined>(undefined);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Booking Form State
    const [bookingOpen, setBookingOpen] = useState(false);
    const [bookingDate, setBookingDate] = useState("");
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
            // gallery length mock hardcoded to 6 based on below
            if (e.key === "ArrowLeft") setCurrentIndex(prev => prev > 0 ? prev - 1 : 5);
            if (e.key === "ArrowRight") setCurrentIndex(prev => prev < 5 ? prev + 1 : 0);
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
                <p className="text-foreground/50 max-w-sm">This property might have been sold or removed by the agent.</p>
            </div>
        );
    }

    const gallery = [
        property.image,
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
        "https://images.unsplash.com/photo-1600566753086-00f18efc2291?w=800&q=80",
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"
    ];

    const priceToDisplay = property.transactionType === "Sell" ? property.expectedPrice : property.monthlyRent;
    const isRent = property.transactionType === "Rent";

    const submitBooking = (e: React.FormEvent) => {
        e.preventDefault();
        setToast("Appointment Request Sent! Our agent will contact you shortly.");
        setBookingOpen(false);
        setTimeout(() => setToast(null), 4000);
    }

    return (
        <div className="pb-24 lg:pb-12 bg-background min-h-screen">

            {/* Booking Modal */}
            {bookingOpen && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border p-6 sm:p-8 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black">Schedule Tour</h2>
                            <button onClick={() => setBookingOpen(false)} className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl mb-8 border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={property.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
                            <div>
                                <p className="font-bold text-sm line-clamp-1">{property.title}</p>
                                <p className="text-xs text-foreground/60">{property.locality}</p>
                            </div>
                        </div>

                        <form onSubmit={submitBooking} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold block mb-2">Preferred Date & Time</label>
                                <input required type="datetime-local" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="text-sm font-bold block mb-2">Your Name</label>
                                <input required type="text" placeholder="John Doe" className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="text-sm font-bold block mb-2">Phone Number</label>
                                <input required type="tel" placeholder="+91 98765 43210" className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <button type="submit" className="w-full mt-4 h-14 bg-primary text-white font-bold rounded-xl flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 text-lg">
                                Confirm Request
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in bg-emerald-500 text-white px-5 py-4 rounded-xl shadow-xl border border-emerald-400 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-bold">{toast}</span>
                </div>
            )}

            {/* ── Public Top Nav ── */}
            <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center animate-pulse-glow">
                            <BotMessageSquare className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tighter hidden sm:block">PropBot Agency</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-foreground/10 transition-colors">
                            <Share2 className="h-4 w-4 text-foreground/70" />
                        </button>
                        <button className="h-10 px-4 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center hover:bg-primary/20 transition-colors" onClick={() => setBookingOpen(true)}>
                            Request Tour
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-10">

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
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg ${property.transactionType === 'Sell' ? 'bg-blue-500/15 text-blue-600' : 'bg-orange-500/15 text-orange-600'}`}>
                                For {property.transactionType}
                            </span>
                            <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-foreground/10 text-foreground/70">
                                {property.type}
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
                            {property.title}
                        </h1>
                        <p className="text-foreground/60 flex items-center gap-2 text-base sm:text-lg font-medium">
                            <MapPin className="h-5 w-5 text-primary" /> {property.fullAddress}
                        </p>
                    </div>

                    <div className="lg:text-right flex flex-col items-start lg:items-end w-full lg:w-auto bg-muted/30 p-6 rounded-3xl border border-border">
                        <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest mb-1">
                            Asking Price
                        </p>
                        <p className="text-4xl sm:text-5xl font-extrabold text-primary flex items-center tracking-tighter">
                            {formatPrice(priceToDisplay)}
                            {isRent && <span className="text-xl text-foreground/40 font-medium ml-2">/mo</span>}
                        </p>
                        <button onClick={() => setBookingOpen(true)} className="w-full mt-6 h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 shadow-md shadow-primary/20">
                            Book a Viewing
                        </button>
                    </div>
                </div>

                {/* ── Main Content Grid ── */}
                <div className="grid lg:grid-cols-3 gap-12">

                    {/* Left Column (Details) */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* Quick Stats Banner */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-8 bg-card border border-border p-6 sm:p-8 rounded-[2rem] shadow-sm">
                            {property.beds ? (
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                        <BedDouble className="h-7 w-7 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black leading-none tracking-tight">{property.beds}</p>
                                        <p className="text-sm font-bold text-foreground/50 mt-1">Beds</p>
                                    </div>
                                </div>
                            ) : null}
                            {property.baths ? (
                                <div className="flex items-center gap-4 border-l border-border pl-4 sm:pl-8">
                                    <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                                        <Bath className="h-7 w-7 text-cyan-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black leading-none tracking-tight">{property.baths}</p>
                                        <p className="text-sm font-bold text-foreground/50 mt-1">Baths</p>
                                    </div>
                                </div>
                            ) : null}
                            {(property.builtUpArea || property.plotArea) ? (
                                <div className={`flex items-center gap-4 ${(property.beds || property.baths) ? 'border-l border-border pl-4 sm:pl-8' : ''}`}>
                                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                        <Maximize className="h-7 w-7 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black leading-none tracking-tight">{property.builtUpArea || property.plotArea}</p>
                                        <p className="text-sm font-bold text-foreground/50 mt-1">Sq Ft</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Description */}
                        <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none">
                            <h2 className="text-2xl font-black tracking-tight mb-4 text-foreground">About this property</h2>
                            <p className="text-foreground/70 leading-relaxed whitespace-pre-wrap font-medium">
                                {property.description}
                            </p>
                        </div>

                        <hr className="border-border/50" />

                        {/* Specs Grid */}
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-6">Property Overview</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">

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
                                        <span className="flex items-center gap-2 text-sm font-bold text-foreground/40 uppercase tracking-widest mb-1.5">
                                            <stat.icon className="h-4 w-4" />
                                            {stat.label}
                                        </span>
                                        <span className="font-bold text-lg">{stat.value}</span>
                                    </div>
                                ))}

                            </div>
                        </div>

                        {/* Amenities */}
                        {property.amenities.length > 0 && (
                            <>
                                <hr className="border-border/50" />
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight mb-6">Amenities & Features</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                        {property.amenities.map(am => (
                                            <div key={am} className="flex items-center gap-3 bg-muted/20 border border-border px-5 py-4 rounded-2xl shadow-sm hover:border-primary/30 transition-colors">
                                                <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                                                <span className="font-bold text-foreground/80">{am}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right Column (Action Sidebar) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-card border border-border shadow-2xl rounded-[2.5rem] p-8 overflow-hidden relative">
                            {/* Decorative blur */}
                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                            <h3 className="text-2xl font-black tracking-tight mb-2 relative z-10">Interested in this property?</h3>
                            <p className="text-sm font-semibold text-foreground/60 mb-8 relative z-10 leading-relaxed">Our AI agent is online 24/7. Ask questions or secure this viewing immediately.</p>

                            <div className="space-y-4 relative z-10">
                                <button className="w-full h-14 bg-[#25D366] hover:bg-[#20BE5A] text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,211,102,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 text-lg tracking-wide">
                                    <MessageSquare className="h-6 w-6" />
                                    Chat on WhatsApp
                                </button>
                                <button onClick={() => setBookingOpen(true)} className="w-full h-14 bg-background border-2 border-border text-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-muted hover:border-foreground/20 transition-all text-base">
                                    <Calendar className="h-5 w-5 text-foreground/60" />
                                    Schedule Viewing
                                </button>
                                <button className="w-full h-14 text-foreground/60 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
                                    <Phone className="h-5 w-5" />
                                    Request Callback
                                </button>
                            </div>

                            <div className="mt-10 pt-8 border-t border-border/50 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-0.5 flex-shrink-0 shadow-lg">
                                        <div className="h-full w-full rounded-full bg-card border-[3px] border-background flex items-center justify-center text-foreground font-black text-xl">
                                            VA
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-foreground/40 mb-1">Listed By Expert</p>
                                        <p className="font-black text-lg tracking-tight text-foreground">Vishal Auti</p>
                                        <p className="text-sm font-medium text-foreground/60 mt-0.5">PropBot AI Agent Group</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center">
                    <div className="absolute top-6 right-6 z-50 text-white flex gap-4 items-center">
                        <span className="text-sm font-bold opacity-70 tracking-wider bg-white/10 px-3 py-1 rounded-full">{currentIndex + 1} / {gallery.length}</span>
                        <button onClick={() => setLightboxOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev > 0 ? prev - 1 : gallery.length - 1); }}
                        className="absolute left-2 sm:left-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 cursor-pointer"
                    >
                        <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>

                    <div className="w-full max-w-6xl h-full p-4 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={gallery[currentIndex]}
                            alt={`${property.title} Fullscreen`}
                            className="max-w-full max-h-[85vh] object-contain select-none shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev < gallery.length - 1 ? prev + 1 : 0); }}
                        className="absolute right-2 sm:right-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 cursor-pointer"
                    >
                        <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
                    </button>
                </div>
            )}
        </div>
    );
}
