"use client";

import {
    ArrowLeft,
    Building2,
    Home,
    Map,
    IndianRupee,
    Check,
    ChevronRight,
    ChevronLeft,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getPropertyById, updateProperty, Property } from "@/lib/properties";
import ImageUploader from "@/components/ui/ImageUploader";

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

export default function EditPropertyPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loadingData, setLoadingData] = useState(true);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState<boolean | string>(false);
    const [originalProperty, setOriginalProperty] = useState<Property | null>(null);

    // Image state
    const [coverImage, setCoverImage] = useState("");
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [initialUploaderImages, setInitialUploaderImages] = useState<string[]>([]);

    const handleImagesChange = (cover: string, gallery: string[]) => {
        setCoverImage(cover);
        setGalleryImages(gallery);
    };

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
    });

    useEffect(() => {
        if (!id) return;
        const fetchProp = async () => {
            setLoadingData(true);
            const prop = await getPropertyById(id);
            if (!prop) {
                setLoadingData(false);
                return;
            }

            setOriginalProperty(prop);
            setCoverImage(prop.image || "");
            setGalleryImages(prop.images || []);

            const initialImgs = [prop.image, ...(prop.images || [])].filter(Boolean) as string[];
            setInitialUploaderImages(initialImgs);

            // Separate standard amenities from extra amenities
            const stdAmenities: string[] = [];
            const extraAmenities: string[] = [];
            (prop.amenities || []).forEach(am => {
                if (AMENITIES_LIST.includes(am)) {
                    stdAmenities.push(am);
                } else {
                    extraAmenities.push(am);
                }
            });
            if (prop.otherAmenities) {
                extraAmenities.push(...prop.otherAmenities);
            }

            setForm({
                transactionType: prop.transactionType || "Sell",
                category: prop.category || "Residential",
                type: prop.type || PROPERTY_TYPES[prop.category || "Residential"][0],
                title: prop.title || "",
                description: prop.description || "",
                city: prop.city || "",
                locality: prop.locality || "",
                fullAddress: prop.fullAddress || "",
                expectedPrice: prop.expectedPrice ? String(prop.expectedPrice) : "",
                negotiable: prop.negotiable || false,
                monthlyRent: prop.monthlyRent ? String(prop.monthlyRent) : "",
                securityDeposit: prop.securityDeposit ? String(prop.securityDeposit) : "",
                availableFrom: prop.availableFrom || "",
                builtUpArea: prop.builtUpArea ? String(prop.builtUpArea) : "",
                plotArea: prop.plotArea ? String(prop.plotArea) : "",
                plotWidth: prop.plotWidth ? String(prop.plotWidth) : "",
                plotLength: prop.plotLength ? String(prop.plotLength) : "",
                cornerPlot: prop.cornerPlot || false,
                beds: prop.beds ? String(prop.beds) : "",
                baths: prop.baths ? String(prop.baths) : "",
                furnishing: prop.furnishing || "Unfurnished",
                parking: prop.parking === true || prop.parking === "Yes" || prop.parking === "Available",
                propertyAge: prop.propertyAge || "0-1 Years",
                readyToMove: prop.readyToMove !== undefined ? prop.readyToMove : true,
                floorNumber: prop.floorNumber || "",
                totalFloors: prop.totalFloors || "",
                garden: prop.garden || false,
                washrooms: prop.washrooms ? String(prop.washrooms) : "",
                amenities: stdAmenities,
                otherAmenities: Array.from(new Set(extraAmenities)).join(", "),
            });

            setLoadingData(false);
        };
        fetchProp();
    }, [id]);

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
        setForm((prev) => ({
            ...prev,
            category: cat,
            type: PROPERTY_TYPES[cat][0]
        }));
    };

    const handleSave = async (status: "Draft" | "Published") => {
        setLoading(status);

        try {
            await updateProperty(id, {
                title: form.title || `Beautiful ${form.type} for ${form.transactionType}`,
                description: form.description || "No description provided.",
                transactionType: form.transactionType as "Sell" | "Rent",
                category: form.category,
                type: form.type,
                city: form.city || "N/A",
                locality: form.locality || "N/A",
                fullAddress: form.fullAddress || "",
                monthlyRent: Number(form.monthlyRent) || undefined,
                expectedPrice: Number(form.expectedPrice) || undefined,
                securityDeposit: Number(form.securityDeposit) || undefined,
                availableFrom: form.availableFrom || undefined,
                image: coverImage,
                images: galleryImages,
                status: status === "Published" ? (originalProperty?.status === "Hidden" ? "Available" : originalProperty?.status || "Available") : "Hidden",
                // Attributes mapping
                beds: Number(form.beds) || 0,
                baths: Number(form.baths) || 0,
                builtUpArea: Number(form.builtUpArea) || 0,
                plotArea: Number(form.plotArea) || 0,
                furnishing: form.furnishing,
                parking: form.parking ? "Yes" : "No",
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
            router.push(`/dashboard/properties/${id}`);
        } catch (e) {
            console.error("Failed to update property:", e);
            setLoading(false);
        }
    };

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(Math.min(step + 1, 4));
    };

    if (loadingData) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-foreground/50 font-medium animate-pulse">Loading property details...</p>
                </div>
            </div>
        );
    }

    if (!originalProperty) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <Building2 className="h-12 w-12 text-foreground/30" />
                <h1 className="text-2xl font-bold">Property Not Found</h1>
                <p className="text-foreground/50 max-w-sm">The property you are trying to edit does not exist.</p>
                <Link href="/dashboard/properties" className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90">
                    Back to Properties
                </Link>
            </div>
        );
    }

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
                <ImageUploader
                    initialImages={initialUploaderImages}
                    maxImages={10}
                    onImagesChange={handleImagesChange}
                />
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
                            <input type="checkbox" id="cornerPlot" name="cornerPlot" checked={form.cornerPlot} onChange={handleChange} className="h-5 w-5 rounded text-primary border-border focus:ring-primary cursor-pointer" />
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
                                    <input type="checkbox" id="garden" name="garden" checked={form.garden} onChange={handleChange} className="h-5 w-5 rounded text-primary cursor-pointer" />
                                    <label htmlFor="garden" className="text-sm font-medium cursor-pointer">Private Garden</label>
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                            <input type="checkbox" id="readyToMove" name="readyToMove" checked={form.readyToMove} onChange={handleChange} className="h-5 w-5 rounded text-primary cursor-pointer" />
                            <label htmlFor="readyToMove" className="text-sm font-medium cursor-pointer">Ready to Move-in</label>
                        </div>
                        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                            <input type="checkbox" id="parking" name="parking" checked={form.parking as boolean} onChange={handleChange} className="h-5 w-5 rounded text-primary cursor-pointer" />
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
                            <input type="checkbox" id="parkingCommercial" name="parking" checked={form.parking as boolean} onChange={handleChange} className="h-5 w-5 rounded text-primary cursor-pointer" />
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
                    <div>
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Security / Token Deposit (₹)</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                            <input type="number" name="securityDeposit" value={form.securityDeposit} onChange={handleChange} className="w-full pl-9 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" placeholder="e.g. 500000" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:col-span-2">
                        <input type="checkbox" id="negotiable" name="negotiable" checked={form.negotiable} onChange={handleChange} className="h-5 w-5 rounded text-primary border-border focus:ring-primary cursor-pointer" />
                        <label htmlFor="negotiable" className="text-sm font-medium cursor-pointer">Price is Negotiable</label>
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
                    <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-foreground/70 block mb-1.5">Available From</label>
                        <input type="date" name="availableFrom" value={form.availableFrom} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm text-foreground" />
                    </div>
                </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mt-8">
                <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4" /> Save Property Changes
                </h3>
                <p className="text-sm text-foreground/70">Clicking save will immediately update this property's details across all client views and AI recommendations.</p>
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
                        <Link href={`/dashboard/properties/${id}`} className="h-10 w-10 shrink-0 rounded-xl border border-border flex items-center justify-center hover:bg-card transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Edit Property</h1>
                            <p className="text-foreground/60 text-sm mt-0.5">Update details for "{originalProperty.title}".</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => handleSave("Published")} disabled={!!loading} className="text-sm font-semibold text-foreground/60 hover:text-foreground hidden sm:block">
                        Save Changes
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
                                <Link href={`/dashboard/properties/${id}`} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                                    Cancel
                                </Link>
                            )}

                            <div className="flex gap-3">
                                {step < 4 ? (
                                    <button type="submit" className="px-8 py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2">
                                        Next <ChevronRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={!!loading} className="px-8 py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2 min-w-[140px] justify-center">
                                        {loading ? (
                                            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : null}
                                        {loading ? "Saving..." : "Save Changes"}
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
