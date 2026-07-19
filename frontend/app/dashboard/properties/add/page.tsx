"use client";

import {
    ArrowLeft,
    Building2,
    Home,
    Map,
    Upload,
    IndianRupee,
    Check,
    X,
    ChevronRight,
    ChevronLeft,
    Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addProperty } from "@/lib/properties";

const CATEGORIES = [
    { id: "Residential", icon: Home },
    { id: "Commercial", icon: Building2 },
    { id: "Land", icon: Map },
];

const PROPERTY_TYPES = {
    Residential: ["Apartment / Flat", "Villa", "Bungalow", "Independent House"],
    Commercial: ["Office", "Shop", "Warehouse", "Showroom"],
    Land: ["Residential Plot", "Commercial Plot", "Agricultural Land"],
};

const AMENITIES_LIST = ["Parking", "Lift", "Power Backup", "Security", "Garden", "Gym", "Swimming Pool"];
const FURNISHING_OPTS = ["Unfurnished", "Semi-Furnished", "Fully Furnished"];

export default function AddPropertyPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState<boolean | string>(false);

    // Form State
    const [form, setForm] = useState({
        transactionType: "Sell",
        category: "Residential" as "Residential" | "Commercial" | "Land",
        type: "Apartment / Flat",
        title: "",
        description: "",
        city: "",
        locality: "",
        fullAddress: "",
        expectedPrice: "",
        negotiable: false,
        monthlyRent: "",
        securityDeposit: "",
        availableFrom: "",
        builtUpArea: "",
        plotArea: "",
        plotWidth: "",
        plotLength: "",
        cornerPlot: false,
        beds: "",
        baths: "",
        furnishing: "Unfurnished",
        parking: false,
        propertyAge: "0-1 Years",
        readyToMove: true,
        floorNumber: "",
        totalFloors: "",
        garden: false,
        washrooms: "",
        amenities: [] as string[],
        otherAmenities: "",
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=80",
    });

    // Track category changes to reset type
    useEffect(() => {
        setForm((prev) => ({ ...prev, type: PROPERTY_TYPES[prev.category][0] }));
    }, [form.category]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const toggleAmenity = (am: string) => {
        setForm((prev) => {
            if (prev.amenities.includes(am)) return { ...prev, amenities: prev.amenities.filter(a => a !== am) };
            return { ...prev, amenities: [...prev.amenities, am] };
        });
    };

    const setCategory = (cat: "Residential" | "Commercial" | "Land") => {
        setForm((prev) => ({ ...prev, category: cat }));
    };

    const handleSave = (status: "Draft" | "Published") => {
        setLoading(status);

        const price = form.transactionType === "Sell" ? Number(form.expectedPrice) : 0;

        // Minimal mock save logic
        addProperty({
            title: form.title || `Beautiful ${form.type} for ${form.transactionType}`,
            description: form.description || "No description provided.",
            transactionType: form.transactionType as "Sell" | "Rent",
            category: form.category,
            type: form.type,
            city: form.city || "N/A",
            locality: form.locality || "N/A",
            fullAddress: form.fullAddress || "",
            price: form.transactionType === "Sell" ? price : Number(form.monthlyRent),
            monthlyRent: Number(form.monthlyRent),
            expectedPrice: Number(form.expectedPrice),
            image: form.category === "Commercial"
                ? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&auto=format&fit=crop&q=80"
                : form.category === "Land"
                    ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&auto=format&fit=crop&q=80"
                    : form.image,
            status: status,
            // Attributes mapping
            beds: Number(form.beds) || 0,
            baths: Number(form.baths) || 0,
            area: Number(form.builtUpArea) || Number(form.plotArea) || 0,
            furnishing: form.furnishing,
            parking: Boolean(form.parking),
            propertyAge: form.propertyAge,
            readyToMove: form.readyToMove,
            floorNumber: form.floorNumber,
            totalFloors: form.totalFloors,
            garden: form.garden,
            washrooms: Number(form.washrooms) || 0,
            plotWidth: Number(form.plotWidth) || 0,
            plotLength: Number(form.plotLength) || 0,
            cornerPlot: form.cornerPlot,
            amenities: [...form.amenities, ...(form.otherAmenities ? form.otherAmenities.split(",").map(s => s.trim()) : [])].filter(Boolean),
        });

        setTimeout(() => {
            router.push("/dashboard/properties");
        }, 1000);
    };

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(Math.min(step + 1, 4));
    };

    /* ====================== RENDERERS ====================== */

    const renderStep1 = () => (
        <div className="space-y-8 animate-fade-in-up">
            {/* Transaction Type */}
            <div>
                <h2 className="text-lg font-semibold mb-4">What kind of listing is this?</h2>
                <div className="flex bg-muted p-1.5 rounded-2xl w-full max-w-sm">
                    {["Sell", "Rent"].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setForm(pr => ({ ...pr, transactionType: t }))}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${form.transactionType === t
                                ? "bg-background text-foreground shadow-sm"
                                : "text-foreground/50 hover:text-foreground"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Property Category</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCategory(c.id as any)}
                            className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${form.category === c.id
                                ? "border-primary bg-primary/5 text-primary scale-[1.02]"
                                : "border-border bg-card text-foreground/60 hover:bg-muted"
                                }`}
                        >
                            <c.icon className="h-8 w-8" />
                            <span className="font-semibold">{c.id}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Type */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Property Type</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROPERTY_TYPES[form.category].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setForm(pr => ({ ...pr, type: t }))}
                            className={`p-4 text-sm font-medium rounded-xl border transition-all ${form.type === t
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground/70 hover:border-primary/40"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-lg font-semibold mb-1">Basic Information</h2>
                <p className="text-sm text-foreground/50 mb-6">These details will be immediately visible to buyers.</p>

                <div className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Property Title *</label>
                        <input required type="text" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Spacious 3BHK with City View" className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Description *</label>
                        <textarea required rows={4} name="description" value={form.description} onChange={handleChange} placeholder="Describe the key highlights..." className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/50 text-sm resize-none" />
                    </div>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
                <div>
                    <label className="text-sm font-medium text-foreground/70 block mb-1.5">City *</label>
                    <input required type="text" name="city" value={form.city} onChange={handleChange} placeholder="Pune" className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                </div>
                <div>
                    <label className="text-sm font-medium text-foreground/70 block mb-1.5">Locality / Area *</label>
                    <input required type="text" name="locality" value={form.locality} onChange={handleChange} placeholder="Baner" className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                </div>
                <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground/70 block mb-1.5">Full Address *</label>
                    <input required type="text" name="fullAddress" value={form.fullAddress} onChange={handleChange} placeholder="Complete street address..." className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                </div>
            </div>

            <div>
                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Photos</label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-card hover:bg-muted/50 transition-colors cursor-pointer group">
                    <ImageIcon className="h-8 w-8 mx-auto text-foreground/30 group-hover:text-primary transition-colors mb-3" />
                    <p className="text-sm text-foreground/60 transition-colors">Drag & drop cover image here, or <span className="text-primary font-medium">browse</span></p>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-lg font-semibold mb-6">Property Specifications</h2>

            {/* Dynamic Fields based on Category */}
            <div className="grid sm:grid-cols-2 gap-6">

                {/* LAND ONLY */}
                {form.category === "Land" ? (
                    <>
                        <div>
                            <label className="text-sm font-medium text-foreground/70 block mb-1.5">Plot Area (sq ft) *</label>
                            <input required type="number" name="plotArea" value={form.plotArea} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground/70 block mb-1.5">Plot Dimensions (L x W ft)</label>
                            <div className="flex gap-2">
                                <input type="number" name="plotLength" value={form.plotLength} onChange={handleChange} placeholder="Length" className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                                <input type="number" name="plotWidth" value={form.plotWidth} onChange={handleChange} placeholder="Width" className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                            <input type="checkbox" id="cornerPlot" name="cornerPlot" checked={form.cornerPlot} onChange={handleChange} className="h-5 w-5 rounded text-primary border-border focus:ring-primary" />
                            <label htmlFor="cornerPlot" className="text-sm font-medium cursor-pointer">This is a Corner Plot</label>
                        </div>
                    </>
                ) : (
                    /* RESIDENTIAL & COMMERCIAL SHARED */
                    <>
                        <div>
                            <label className="text-sm font-medium text-foreground/70 block mb-1.5">Built-up Area (sq ft) *</label>
                            <input required type="number" name="builtUpArea" value={form.builtUpArea} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground/70 block mb-1.5">Furnishing</label>
                            <select name="furnishing" value={form.furnishing} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground">
                                {FURNISHING_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </>
                )}

                {/* RESIDENTIAL ONLY */}
                {form.category === "Residential" && (
                    <>
                        <div>
                            <label className="text-sm font-medium text-foreground/70 block mb-1.5">Bedrooms *</label>
                            <input required type="number" name="beds" value={form.beds} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground/70 block mb-1.5">Bathrooms *</label>
                            <input required type="number" name="baths" value={form.baths} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                        </div>

                        {(form.type === "Apartment / Flat") && (
                            <>
                                <div>
                                    <label className="text-sm font-medium text-foreground/70 block mb-1.5">Floor Number</label>
                                    <input type="number" name="floorNumber" value={form.floorNumber} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground/70 block mb-1.5">Total Floors</label>
                                    <input type="number" name="totalFloors" value={form.totalFloors} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                                </div>
                            </>
                        )}

                        {(form.type === "Villa" || form.type === "Bungalow" || form.type === "Independent House") && (
                            <>
                                <div>
                                    <label className="text-sm font-medium text-foreground/70 block mb-1.5">Plot Area (sq ft)</label>
                                    <input type="number" name="plotArea" value={form.plotArea} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                                </div>
                                <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                                    <input type="checkbox" id="garden" name="garden" checked={form.garden} onChange={handleChange} className="h-5 w-5 rounded text-primary" />
                                    <label htmlFor="garden" className="text-sm font-medium cursor-pointer">Private Garden</label>
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                            <input type="checkbox" id="readyToMove" name="readyToMove" checked={form.readyToMove} onChange={handleChange} className="h-5 w-5 rounded text-primary" />
                            <label htmlFor="readyToMove" className="text-sm font-medium cursor-pointer">Ready to Move-in</label>
                        </div>
                        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                            <input type="checkbox" id="parking" name="parking" checked={form.parking as boolean} onChange={handleChange} className="h-5 w-5 rounded text-primary" />
                            <label htmlFor="parking" className="text-sm font-medium cursor-pointer">Dedicated Parking</label>
                        </div>
                    </>
                )}

                {/* COMMERCIAL ONLY */}
                {form.category === "Commercial" && (
                    <>
                        <div>
                            <label className="text-sm font-medium text-foreground/70 block mb-1.5">Washrooms</label>
                            <input type="number" name="washrooms" value={form.washrooms} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                        </div>
                        {form.type === "Office" && (
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Floor Number</label>
                                <input type="number" name="floorNumber" value={form.floorNumber} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm" />
                            </div>
                        )}
                        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                            <input type="checkbox" id="parkingCommercial" name="parking" checked={form.parking as boolean} onChange={handleChange} className="h-5 w-5 rounded text-primary" />
                            <label htmlFor="parkingCommercial" className="text-sm font-medium cursor-pointer">Parking Facility</label>
                        </div>
                    </>
                )}
            </div>

            {/* AMENITIES */}
            {form.category !== "Land" && (
                <div className="mt-8 pt-8 border-t border-border">
                    <h2 className="text-lg font-semibold mb-4">Amenities</h2>
                    <div className="flex flex-wrap gap-2 text-sm">
                        {AMENITIES_LIST.map((am) => (
                            <button
                                key={am}
                                type="button"
                                onClick={() => toggleAmenity(am)}
                                className={`py-2 px-4 rounded-full border transition-all ${form.amenities.includes(am)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-foreground/70 hover:border-foreground/30"
                                    }`}
                            >
                                {am}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4">
                        <label className="text-xs font-medium text-foreground/50 block mb-1.5">Other Amenities (comma separated)</label>
                        <input type="text" name="otherAmenities" value={form.otherAmenities} onChange={handleChange} placeholder="e.g. CCTV, Automation, Theater" className="w-full px-4 py-2.5 rounded-xl bg-card border border-border focus:ring-1 focus:ring-primary/50 text-sm" />
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-lg font-semibold mb-6">Financials</h2>

            {form.transactionType === "Sell" ? (
                <div className="grid sm:grid-cols-2 gap-6 bg-card border border-border p-6 rounded-2xl">
                    <div>
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Expected Price (₹) *</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                            <input required type="number" name="expectedPrice" value={form.expectedPrice} onChange={handleChange} className="w-full pl-9 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" placeholder="e.g. 8500000" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="negotiable" name="negotiable" checked={form.negotiable} onChange={handleChange} className="h-5 w-5 rounded text-primary mt-6" />
                        <label htmlFor="negotiable" className="text-sm font-medium mt-6 cursor-pointer">Price is Negotiable</label>
                    </div>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-6 bg-card border border-border p-6 rounded-2xl">
                    <div>
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Monthly Rent (₹) *</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                            <input required type="number" name="monthlyRent" value={form.monthlyRent} onChange={handleChange} className="w-full pl-9 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" placeholder="e.g. 35000" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Security Deposit (₹)</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                            <input type="number" name="securityDeposit" value={form.securityDeposit} onChange={handleChange} className="w-full pl-9 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" placeholder="e.g. 100000" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Available From</label>
                        <input type="date" name="availableFrom" value={form.availableFrom} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm text-foreground" />
                    </div>
                </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mt-8">
                <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4" /> Ready to go live!
                </h3>
                <p className="text-sm text-foreground/70">Please verify all details before publishing. PropBot AI will immediately begin matching this listing with your leads.</p>
            </div>
        </div>
    );


    const renderProgressBar = () => (
        <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center flex-1 relative">
                    {i > 1 && (
                        <div className={`absolute top-4 -left-1/2 w-full h-1 -translate-y-1/2 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
                    )}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i === step ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                        : i < step ? "bg-primary text-primary-foreground"
                            : "bg-card border-2 border-border text-foreground/50"
                        }`}>
                        {i < step ? <Check className="h-4 w-4" /> : i}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-foreground/50 mt-2 hidden sm:block">
                        {i === 1 ? "Type" : i === 2 ? "Basic" : i === 3 ? "Specs" : "Financials"}
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex justify-center pb-32">
            <div className="w-full max-w-3xl">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/properties" className="h-10 w-10 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-card transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Add New Property</h1>
                            <p className="text-foreground/60 text-sm mt-0.5">List a property in under 2 minutes.</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => handleSave("Draft")} disabled={!!loading} className="text-sm font-semibold text-foreground/60 hover:text-foreground hidden sm:block">
                        Save & Exit
                    </button>
                </div>

                {renderProgressBar()}

                {/* Form Container */}
                <form onSubmit={step === 4 ? (e) => { e.preventDefault(); handleSave("Published"); } : nextStep}>

                    <div className="min-h-[400px] pb-32">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                    </div>

                    {/* Bottom Action Bar (Sticky) */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-40 lg:left-64 transition-all">
                        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                            {step > 1 ? (
                                <button type="button" onClick={() => setStep(step - 1)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2">
                                    <ChevronLeft className="h-4 w-4" /> Back
                                </button>
                            ) : (
                                <Link href="/dashboard/properties" className="px-5 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                                    Cancel
                                </Link>
                            )}

                            <div className="flex gap-3">
                                <button type="button" onClick={() => handleSave("Draft")} disabled={!!loading} className="px-5 py-3 rounded-xl font-semibold text-sm bg-muted text-foreground/80 hover:bg-muted/80 transition-colors hidden sm:block">
                                    Save Draft
                                </button>
                                {step < 4 ? (
                                    <button type="submit" className="px-8 py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2">
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={!!loading} className="px-8 py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2 min-w-[140px] justify-center">
                                        {loading === "Published" ? (
                                            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : null}
                                        {loading === "Published" ? "Publishing" : "Publish Property"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>

            </div>
        </div>
    );
}
