"use client";

import { useState, useEffect } from "react";
import {
    Plus, Search, Trash2, Loader2, AlertCircle, MessageSquare, 
    Check, X, Globe, FileText, CheckCircle2, ChevronRight, Info
} from "lucide-react";

interface TemplateComponent {
    type: string;
    text?: string;
    format?: string;
    buttons?: any[];
}

interface WhatsAppTemplate {
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

export default function TemplatesPage() {
    const [wabas, setWabas] = useState<any[]>([]);
    const [loadingWaba, setLoadingWaba] = useState(true);
    const [selectedWabaId, setSelectedWabaId] = useState<string>("");

    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Create Form State
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("MARKETING");
    const [newLanguage, setNewLanguage] = useState("en_US");
    const [newBodyText, setNewBodyText] = useState("");
    const [newHeaderText, setNewHeaderText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Fetch WABA lists
    const fetchWabas = async () => {
        try {
            const res = await fetch("/api/auth/waba");
            if (res.ok) {
                const data = await res.json();
                setWabas(data.wabas || []);
                if (data.wabas && data.wabas.length > 0) {
                    setSelectedWabaId(data.wabas[0].waba_id);
                }
            }
        } catch (err) {
            console.error("Failed to load WABA accounts:", err);
        } finally {
            setLoadingWaba(false);
        }
    };

    // Fetch Templates for Selected WABA
    const fetchTemplates = async (wabaId: string) => {
        if (!wabaId) return;
        setLoadingTemplates(true);
        setError(null);
        try {
            const res = await fetch(`/api/paid_messaging/templates/all?waba_id=${wabaId}`);
            if (res.ok) {
                const data = await res.json();
                setTemplates(data.templates || []);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to load templates.");
            }
        } catch (err) {
            setError("Could not establish connection to server.");
        } finally {
            setLoadingTemplates(false);
        }
    };

    useEffect(() => {
        fetchWabas();
    }, []);

    useEffect(() => {
        if (selectedWabaId) {
            fetchTemplates(selectedWabaId);
        }
    }, [selectedWabaId]);

    const triggerToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        const cleanName = newName.trim().toLowerCase();
        if (!/^[a-z0-9_]+$/.test(cleanName)) {
            triggerToast("Template name must contain only lowercase letters, numbers, and underscores.", "error");
            return;
        }

        if (!newBodyText.trim()) {
            triggerToast("Template body text is required.", "error");
            return;
        }

        setSubmitting(true);

        const components: TemplateComponent[] = [];

        if (newHeaderText.trim()) {
            components.push({
                type: "HEADER",
                format: "TEXT",
                text: newHeaderText.trim()
            });
        }

        components.push({
            type: "BODY",
            text: newBodyText.trim()
        });

        try {
            const res = await fetch("/api/paid_messaging/templates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    waba_id: selectedWabaId,
                    name: cleanName,
                    category: newCategory,
                    language: newLanguage,
                    components
                })
            });

            const data = await res.json();

            if (res.ok) {
                triggerToast("WhatsApp template created successfully!", "success");
                setShowCreateModal(false);
                // Reset form
                setNewName("");
                setNewCategory("MARKETING");
                setNewLanguage("en_US");
                setNewBodyText("");
                setNewHeaderText("");
                // Refresh list
                fetchTemplates(selectedWabaId);
            } else {
                triggerToast(data.error || "Failed to create template", "error");
            }
        } catch (err) {
            triggerToast("Network error. Please try again.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTemplate = async (name: string) => {
        try {
            const res = await fetch("/api/paid_messaging/templates", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    waba_id: selectedWabaId,
                    name
                })
            });

            const data = await res.json();
            if (res.ok) {
                triggerToast("Template deleted successfully.", "success");
                setShowDeleteConfirm(null);
                fetchTemplates(selectedWabaId);
            } else {
                triggerToast(data.error || "Failed to delete template.", "error");
            }
        } catch (err) {
            triggerToast("Network error. Could not delete template.", "error");
        }
    };

    // Filter templates logic
    const filteredTemplates = templates.filter(tpl => {
        const matchesSearch = tpl.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (tpl.components.find(c => c.type === "BODY")?.text || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || tpl.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesCategory = categoryFilter === "all" || tpl.category.toLowerCase() === categoryFilter.toLowerCase();
        return matchesSearch && matchesStatus && matchesCategory;
    });

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case "APPROVED":
                return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
            case "PENDING":
                return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
            case "REJECTED":
                return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
            case "PAUSED":
                return "bg-yellow-600/10 text-yellow-600 border border-yellow-600/20";
            default:
                return "bg-foreground/5 text-foreground/50 border border-foreground/10";
        }
    };

    // Helper to format body text variables in preview
    const highlightVariables = (text: string) => {
        if (!text) return "";
        const parts = text.split(/(\{\{\d+\}\})/g);
        return parts.map((part, index) => {
            if (part.match(/^\{\{\d+\}\}$/)) {
                return (
                    <span key={index} className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-semibold font-mono mx-0.5">
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    if (loadingWaba) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-foreground/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm font-semibold">Loading account configurations...</p>
            </div>
        );
    }

    if (wabas.length === 0) {
        return (
            <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
                <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-5 shadow-sm max-w-lg mx-auto mt-12">
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                        <MessageSquare className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">No Connected WhatsApp Account</h2>
                        <p className="text-sm text-foreground/60 mt-2 leading-relaxed">
                            You must link a WhatsApp Business Account (WABA) before you can manage message templates.
                        </p>
                    </div>
                    <a
                        href="/dashboard/settings"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 shadow-sm transition-all"
                    >
                        Go to Settings
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Toast System */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in bg-card px-5 py-3.5 rounded-xl shadow-2xl border border-border flex items-center gap-3">
                    {toast.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-sm">{toast.message}</span>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">WhatsApp Templates</h1>
                    <p className="text-sm text-foreground/50 mt-1">
                        Create, delete and sync templates for your connected WhatsApp Business Account.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedWabaId}
                        onChange={(e) => setSelectedWabaId(e.target.value)}
                        className="h-10 px-3.5 rounded-xl bg-card border border-border text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                        {wabas.map(w => (
                            <option key={w.waba_id} value={w.waba_id}>
                                WABA: {w.waba_id.substring(0, 10)}...
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:opacity-95 shadow-sm transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Create Template
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-card border border-border p-3.5 rounded-2xl">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-foreground/40" />
                    <input
                        type="text"
                        placeholder="Search by name or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 rounded-xl bg-background border border-border/80 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-background border border-border/80 text-sm focus:outline-none"
                >
                    <option value="all">All Categories</option>
                    <option value="marketing">Marketing</option>
                    <option value="utility">Utility</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-background border border-border/80 text-sm focus:outline-none"
                >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="paused">Paused</option>
                </select>
            </div>

            {/* Main Templates Display */}
            {loadingTemplates ? (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/50">
                    <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
                    <p className="text-sm">Fetching template list...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center space-y-3.5">
                    <AlertCircle className="h-9 w-9 text-rose-500" />
                    <h3 className="font-bold">Sync Error</h3>
                    <p className="text-sm text-foreground/60 leading-relaxed">{error}</p>
                    <button
                        onClick={() => fetchTemplates(selectedWabaId)}
                        className="px-4 py-2 bg-secondary rounded-xl text-sm font-semibold border border-border hover:bg-border/60 transition-all"
                    >
                        Try Again
                    </button>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="bg-card border border-border/65 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-md mx-auto">
                    <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">No Templates Found</h3>
                        <p className="text-sm text-foreground/50 mt-1 leading-relaxed">
                            {searchTerm || statusFilter !== "all" || categoryFilter !== "all" 
                                ? "No templates match your active filters." 
                                : "Create your first WhatsApp Business message template to start broadcast campaigns."}
                        </p>
                    </div>
                    {(searchTerm || statusFilter !== "all" || categoryFilter !== "all") && (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setCategoryFilter("all");
                            }}
                            className="text-primary hover:underline text-sm font-bold"
                        >
                            Reset all filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTemplates.map((template) => {
                        const bodyComponent = template.components.find(c => c.type === "BODY");
                        const headerComponent = template.components.find(c => c.type === "HEADER");
                        return (
                            <div
                                key={template.name}
                                className="group relative bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col min-h-[250px]"
                            >
                                {/* Card Header */}
                                <div className="p-5 border-b border-border/50 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors" title={template.name}>
                                            {template.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold tracking-wide uppercase text-foreground/60 border border-border">
                                                {template.category}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-foreground/40">
                                                <Globe className="h-3 w-3" />
                                                {template.language}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(template.status)}`}>
                                        {template.status}
                                    </span>
                                </div>

                                {/* Live Mock WhatsApp View */}
                                <div className="p-5 flex-1 flex flex-col bg-muted/20">
                                    <div className="bg-background border border-border/80 rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed max-w-[90%] relative space-y-1">
                                        {headerComponent?.text && (
                                            <p className="font-bold border-b border-border/40 pb-1 mb-1 text-foreground/90">
                                                {headerComponent.text}
                                            </p>
                                        )}
                                        <p className="text-foreground/80 whitespace-pre-wrap">
                                            {highlightVariables(bodyComponent?.text || "")}
                                        </p>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="px-5 py-3.5 border-t border-border/50 flex justify-end items-center bg-card">
                                    <button
                                        onClick={() => setShowDeleteConfirm(template.name)}
                                        className="h-8 w-8 rounded-lg text-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                                        title="Delete Template"
                                    >
                                        <Trash2 className="h-4.5 w-4.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Template Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold">Create WhatsApp Template</h2>
                                <p className="text-xs text-foreground/50 mt-0.5">Submit a message template to WhatsApp Business for review.</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-secondary transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Modal Form Content */}
                        <form onSubmit={handleCreateTemplate} className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
                            {/* Editor Panel */}
                            <div className="p-6 flex-1 space-y-4 max-h-[500px] overflow-y-auto">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1.5">Template Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. seasonal_promotion_alert"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                        className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                    <span className="text-[10px] text-foreground/40 mt-1 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Lowercase letters, numbers, and underscores only.
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1.5">Category</label>
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none"
                                        >
                                            <option value="MARKETING">Marketing</option>
                                            <option value="UTILITY">Utility</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1.5">Language</label>
                                        <select
                                            value={newLanguage}
                                            onChange={(e) => setNewLanguage(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none"
                                        >
                                            <option value="en_US">English (US)</option>
                                            <option value="es_ES">Spanish (Spain)</option>
                                            <option value="pt_BR">Portuguese (Brazil)</option>
                                            <option value="fr_FR">French (France)</option>
                                            <option value="de_DE">German</option>
                                            <option value="it_IT">Italian</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1.5">Header Text (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Special Offer!"
                                        value={newHeaderText}
                                        onChange={(e) => setNewHeaderText(e.target.value)}
                                        className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1.5">Body Message</label>
                                    <textarea
                                        required
                                        placeholder="Hello {{1}}, check out this premium listing at {{2}}!"
                                        rows={4}
                                        value={newBodyText}
                                        onChange={(e) => setNewBodyText(e.target.value)}
                                        className="w-full p-3.5 rounded-xl bg-background border border-border text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                                    />
                                    <span className="text-[10px] text-foreground/40 mt-1 block">
                                        Use double curly brackets with numbers like <span className="font-mono bg-secondary px-1 py-0.5 rounded text-primary font-bold">{"{{1}}"}</span> for dynamic parameters.
                                    </span>
                                </div>
                            </div>

                            {/* Preview Panel */}
                            <div className="p-6 bg-muted/15 w-full lg:w-72 flex flex-col justify-between">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground/40 mb-3.5">Live Mockup Preview</label>
                                    <div className="bg-background border border-border rounded-2xl p-4 shadow-sm text-xs leading-relaxed space-y-1 relative">
                                        {newHeaderText.trim() && (
                                            <p className="font-bold border-b border-border/40 pb-1 mb-1 text-foreground/90">
                                                {newHeaderText}
                                            </p>
                                        )}
                                        <p className="text-foreground/80 whitespace-pre-wrap">
                                            {newBodyText ? highlightVariables(newBodyText) : <span className="text-foreground/30 italic">No body content typed yet...</span>}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border/60">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 h-10 rounded-xl border border-border font-semibold text-sm hover:bg-secondary transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all"
                                    >
                                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="h-12 w-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Delete Template</h3>
                            <p className="text-sm text-foreground/60 mt-1 leading-relaxed">
                                Are you sure you want to delete the WhatsApp template <span className="font-semibold text-foreground">"{showDeleteConfirm}"</span>? This will permanently remove it from your WhatsApp Business Account.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3.5 pt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 bg-secondary rounded-xl text-sm font-semibold border border-border hover:bg-border/60 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteTemplate(showDeleteConfirm)}
                                className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                            >
                                Delete Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
