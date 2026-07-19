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

export const getProperties = (): Property[] => {
    if (typeof window === "undefined") return DEFAULT_PROPERTIES;
    const stored = localStorage.getItem("propbot_properties");

    // Automatically reset if old cache doesn't have the new category fields
    if (!stored || !stored.includes("Commercial Plot")) {
        localStorage.setItem("propbot_properties", JSON.stringify(DEFAULT_PROPERTIES));
        return DEFAULT_PROPERTIES;
    }

    try {
        return JSON.parse(stored);
    } catch (e) {
        return DEFAULT_PROPERTIES;
    }
};

export const addProperty = (prop: Omit<Property, "id">): void => {
    if (typeof window === "undefined") return;
    const current = getProperties();
    const newProp: Property = {
        ...prop,
        id: Date.now().toString(),
    };
    localStorage.setItem("propbot_properties", JSON.stringify([newProp, ...current]));
};

export const getPropertyById = (id: string): Property | undefined => {
    const all = getProperties();
    return all.find(p => p.id === id);
};

export const updatePropertyStatus = (id: string, status: string): void => {
    if (typeof window === "undefined") return;
    const all = getProperties();
    const updated = all.map(p => p.id === id ? { ...p, status } : p);
    localStorage.setItem("propbot_properties", JSON.stringify(updated));
};

export const deleteProperty = (id: string): void => {
    if (typeof window === "undefined") return;
    const all = getProperties();
    const filtered = all.filter(p => p.id !== id);
    localStorage.setItem("propbot_properties", JSON.stringify(filtered));
};
