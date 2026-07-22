export interface Property {
    id: string;
    title: string;
    description: string;

    // Transaction
    transactionType: "Sell" | "Rent";
    expectedPrice?: number;
    negotiable?: boolean;
    monthlyRent?: number;
    securityDeposit?: number;
    availableFrom?: string;

    category: "Residential" | "Commercial" | "Land";
    type: string; // Apartment, Villa, Office, etc.

    // Address
    city: string;
    locality: string;
    fullAddress: string;

    // Images
    image: string; // Cover
    images?: string[];

    // General Attributes
    builtUpArea?: number;
    plotArea?: number;
    furnishing?: string;
    parking?: boolean | string;
    status: string;

    // Residential Specific
    beds?: number;
    baths?: number;
    propertyAge?: string;
    readyToMove?: boolean;
    floorNumber?: string;
    totalFloors?: string;
    garden?: boolean;

    // Commercial Specific
    washrooms?: number;

    // Plot Specific
    plotWidth?: number;
    plotLength?: number;
    cornerPlot?: boolean;

    // Amenities
    amenities: string[];
    otherAmenities?: string[];
    agent_name?: string;
    agent_phone?: string;
    slug?: string;
}

const DEFAULT_PROPERTIES: Property[] = [
    {
        id: "1",
        title: "Luxury 3 BHK Apartment",
        description: "A well-designed 3 BHK apartment in the prime Baner locality with excellent ventilation and panoramic views of the city skyline. Features a modular kitchen, imported marble flooring, and smart home automation features. Perfect for families looking for a premium lifestyle.",
        transactionType: "Sell",
        expectedPrice: 8500000,
        negotiable: true,
        category: "Residential",
        type: "Apartment / Flat",
        city: "Pune",
        locality: "Baner",
        fullAddress: "101, Balewadi High Street, Baner, Pune",
        image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&auto=format&fit=crop&q=80",
        images: [],
        builtUpArea: 1450,
        furnishing: "Semi-Furnished",
        parking: true,
        status: "Available",
        beds: 3,
        baths: 2,
        propertyAge: "0-1 Years",
        readyToMove: true,
        floorNumber: "5",
        totalFloors: "12",
        amenities: ["Swimming Pool", "Gym", "Security", "Parking", "Club House"],
    },
    {
        id: "2",
        title: "Premium Office Space",
        description: "Spacious, fully air-conditioned office space located in the heart of Hinjewadi IT Park. Open floor plan, meeting rooms, and a dedicated cafeteria area. Excellent connectivity and surrounding ecosystem for tech startups and enterprises alike.",
        transactionType: "Rent",
        monthlyRent: 85000,
        securityDeposit: 500000,
        availableFrom: "2026-08-01",
        category: "Commercial",
        type: "Office",
        city: "Pune",
        locality: "Hinjewadi",
        fullAddress: "Tower A, Phase 1, Hinjewadi IT Park, Pune",
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&auto=format&fit=crop&q=80",
        images: [],
        builtUpArea: 2400,
        furnishing: "Fully Furnished",
        parking: true,
        status: "Available",
        washrooms: 2,
        floorNumber: "4",
        totalFloors: "10",
        amenities: ["Central AC", "Security", "Parking", "Power Backup", "Cafeteria"],
    },
    {
        id: "3",
        title: "Prime Commercial Plot",
        description: "A rectangular, well-leveled corner plot located on a busy intersection. Ideal for building a retail showroom, commercial complex, or a hospitality venture. Water and electricity connections are already sanctioned.",
        transactionType: "Sell",
        expectedPrice: 45000000,
        negotiable: false,
        category: "Land",
        type: "Commercial Plot",
        city: "Pune",
        locality: "Wakad",
        fullAddress: "Main Road intersection, Wakad, Pune",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&auto=format&fit=crop&q=80",
        images: [],
        plotArea: 5000,
        plotWidth: 50,
        plotLength: 100,
        cornerPlot: true,
        status: "Available",
        amenities: ["Water Connection", "Electricity", "Road Access"],
    }
];

import { mapBackendPropertyToFrontend } from "./api";

export const getProperties = async (): Promise<Property[]> => {
    try {
        const res = await fetch("/api/properties");
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.map(mapBackendPropertyToFrontend) : [];
    } catch (e) {
        console.error("Failed to get properties:", e);
        return [];
    }
};

export const getPropertyById = async (id: string): Promise<Property | undefined> => {
    try {
        const parts = id.split("-");
        const realId = parts[parts.length - 1] || id;

        const res = await fetch(`/api/properties/${realId}`);
        if (!res.ok) return undefined;
        const data = await res.json();
        return mapBackendPropertyToFrontend(data);
    } catch (e) {
        console.error(`Failed to get property ${id}:`, e);
        return undefined;
    }
};

export const addProperty = async (prop: Omit<Property, "id">): Promise<void> => {
    try {
        const backendPayload = {
            title: prop.title,
            description: prop.description,
            transaction_type: prop.transactionType,
            expected_price: prop.expectedPrice,
            negotiable: prop.negotiable,
            monthly_rent: prop.monthlyRent,
            security_deposit: prop.securityDeposit,
            available_from: prop.availableFrom,
            category: prop.category,
            type: prop.type,
            city: prop.city,
            locality: prop.locality,
            full_address: prop.fullAddress,
            image: prop.image,
            images: prop.images,
            built_up_area: prop.builtUpArea,
            plot_area: prop.plotArea,
            furnishing: prop.furnishing,
            parking: prop.parking,
            status: prop.status,
            beds: prop.beds,
            baths: prop.baths,
            property_age: prop.propertyAge,
            ready_to_move: prop.readyToMove,
            floor_number: prop.floorNumber,
            total_floors: prop.totalFloors,
            garden: prop.garden,
            washrooms: prop.washrooms,
            plot_width: prop.plotWidth,
            plot_length: prop.plotLength,
            corner_plot: prop.cornerPlot,
            amenities: prop.amenities,
            other_amenities: prop.otherAmenities,
        };

        const res = await fetch("/api/properties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(backendPayload),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Failed to add property");
        }
    } catch (e) {
        console.error("Failed to add property:", e);
        throw e;
    }
};

export const updatePropertyStatus = async (id: string, status: string): Promise<void> => {
    try {
        const res = await fetch(`/api/properties/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Failed to update status");
    } catch (e) {
        console.error("Failed to update status:", e);
    }
};

export const deleteProperty = async (id: string): Promise<void> => {
    try {
        const res = await fetch(`/api/properties/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete property");
    } catch (e) {
        console.error("Failed to delete property:", e);
    }
};

export function getPropertyShareUrl(property: Property): string {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;

    if (property.slug) {
        return `${baseUrl}/p/${property.slug}`;
    }

    const clean = (str: string) => str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const titleSlug = clean(property.title || "property");
    const localitySlug = clean(property.locality || "locality");
    const citySlug = clean(property.city || "city");
    const randomSuffix = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');

    return `${baseUrl}/p/${titleSlug}-${localitySlug}-${citySlug}-${randomSuffix}-${property.id}`;
}
