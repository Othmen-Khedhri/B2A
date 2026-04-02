import { useState, useEffect, useCallback, useRef } from "react";
import { Building2, Plus, Search, Pencil, Trash2, X, Phone, Mail, MapPin, FileText, Upload, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

interface Client {
  _id: string;
  name: string;
  sector: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  siret: string;
  espaceClient: string;
  espaceExtranet: string;
  formeJuridique: string;
  tvaRegime: string;
  tvaDate: string;
  dateCloture: string;
  etat: string;
  pays: string;
  assignedTo: string;
  externalId: string;
  idGrpIntTeams: string;
  createdAt: string;
}

const SECTORS = [
  "Accounting", "Finance", "Legal", "Healthcare", "Real Estate",
  "Retail", "Technology", "Manufacturing", "Construction", "Education",
  "Hospitality", "Transport", "Other",
];

const SECTOR_LABELS: Record<string, string> = {
  Accounting: "Comptabilité", Finance: "Finance", Legal: "Juridique",
  Healthcare: "Santé", "Real Estate": "Immobilier", Retail: "Commerce",
  Technology: "Technologie", Manufacturing: "Industrie", Construction: "Construction",
  Education: "Éducation", Hospitality: "Hôtellerie", Transport: "Transport", Other: "Autre",
};

const SECTOR_COLORS: Record<string, string> = {
  Accounting: "bg-[#FFD600]/10 text-[#FFD600] dark:bg-[#FFD600]/10 dark:text-[#FFD600]",
  Finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Legal: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Healthcare: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "Real Estate": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Retail: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Technology: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Manufacturing: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Construction: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Education: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Hospitality: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Transport: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Other: "bg-black/[0.04] dark:bg-white/[0.06] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]",
};

const empty = (): Partial<Client> => ({
  name: "", sector: "", phone: "", email: "", address: "", notes: "",
  siret: "", espaceClient: "", espaceExtranet: "", formeJuridique: "",
  tvaRegime: "", tvaDate: "", dateCloture: "", etat: "", pays: "",
  assignedTo: "", externalId: "", idGrpIntTeams: "",
});

/* ── Avatar initials ────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/* ── Client Card ────────────────────────────────────────────────────────── */
function ClientCard({
  client,
  onEdit,
  onDelete,
  onProfile,
}: {
  client: Client;
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
  onProfile: (c: Client) => void;
}) {
  const { t, lang } = useLanguage();
  const sectorLabel = lang === "fr" ? (SECTOR_LABELS[client.sector] ?? client.sector) : client.sector;
  const color = SECTOR_COLORS[client.sector] ?? SECTOR_COLORS["Other"];

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-lg border border-[#CACAC4] dark:border-white/[0.06] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#9E9EA3]/20 dark:bg-[#9E9EA3]/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials(client.name)}
          </div>
          <div>
            <p className="font-semibold text-[#0D0D0D] dark:text-white text-sm leading-tight">{client.name}</p>
            {client.sector && (
              <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                {sectorLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(client)}
            className="p-1.5 rounded-lg text-[#9E9EA3] hover:text-[#9E9EA3] hover:bg-black/[0.04] dark:bg-white/[0.06] dark:hover:bg-[#9E9EA3]/30 transition"
            title={t("common.edit")}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(client)}
            className="p-1.5 rounded-lg text-[#9E9EA3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
            title={t("common.delete")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
        {client.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{client.phone}</span>
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{client.address}</span>
          </div>
        )}
        {client.notes && (
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{client.notes}</span>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="pt-2 border-t border-[#CACAC4] dark:border-white/[0.06]">
        <button
          onClick={() => onProfile(client)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-black/[0.04] dark:bg-white/[0.06] dark:hover:bg-[#9E9EA3]/30 transition"
        >
          {t("clients.profile.btn")} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
const Clients = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<Partial<Client>>(empty());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete modal
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/clients", { params: search ? { search } : {} });
      setClients(data);
    } catch {
      // silently ignore — empty list shown
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  /* ── Open Add ─── */
  const openAdd = () => {
    setForm(empty());
    setIsEdit(false);
    setFormError("");
    setShowForm(true);
  };

  /* ── Open Edit ─── */
  const openEdit = (c: Client) => {
    setForm({ ...c });
    setIsEdit(true);
    setFormError("");
    setShowForm(true);
  };

  /* ── Submit form ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name?.trim()) { setFormError(t("clients.modal.name_required")); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/clients/${(form as Client)._id}`, form);
      } else {
        await api.post("/clients", form);
      }
      setShowForm(false);
      fetchClients();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? t("clients.modal.error"));
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ─── */
  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/clients/${toDelete._id}`);
      setToDelete(null);
      fetchClients();
    } finally {
      setDeleting(false);
    }
  };

  /* ── Import Excel ─── */
  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImport(true);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const { data } = await api.post("/clients/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(data);
      fetchClients();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setImportResult({ imported: 0, updated: 0, skipped: 0, errors: [msg ?? "Import failed"] });
    } finally {
      setImporting(false);
    }
  };

  const field = (key: keyof Client) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]";
  const labelCls = "block text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] mb-1";

  return (
    <div className="space-y-6">
      {/* ── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9EA3]" />
          <input
            type="text"
            placeholder={t("clients.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openImport}
            className="flex items-center gap-2 px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] dark:bg-[#9E9EA3]/30 hover:bg-black/[0.04] dark:bg-white/[0.04] text-[#6B6B6F] dark:text-[#9E9EA3] text-sm font-medium rounded-lg transition"
          >
            <Upload className="w-4 h-4" />
            {t("clients.import")}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            {t("clients.add")}
          </button>
        </div>
      </div>

      {/* ── Grid ─── */}
      {loading ? (
        <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">{t("common.loading")}</p>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#9E9EA3]">
          <Building2 className="w-12 h-12 opacity-30" />
          <p className="text-sm">{t("clients.no_found")}</p>
          <button onClick={openAdd} className="text-[#9E9EA3] text-sm hover:underline">
            {t("clients.add_one")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map((c) => (
            <ClientCard key={c._id} client={c} onEdit={openEdit} onDelete={setToDelete} onProfile={(c) => navigate(`/dashboard/clients/${c._id}`)} />
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ─── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#CACAC4] dark:border-white/[0.06] shrink-0">
              <h2 className="text-lg font-bold text-[#0D0D0D] dark:text-white">
                {isEdit ? `${t("clients.modal.edit_title")} — ${(form as Client).name}` : t("clients.modal.add_title")}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[#9E9EA3] hover:text-[#9E9EA3] dark:hover:text-[#0D0D0D] dark:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-8 py-6 space-y-6">
              {formError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</p>
              )}

              {/* ── Section: General ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3] pb-2 mb-3 border-b border-[#CACAC4] dark:border-white/[0.06]">
                  {t("clients.profile.section_main")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>{t("clients.modal.name")} *</label>
                    <input type="text" value={form.name ?? ""} onChange={field("name")} className={inputCls} placeholder={t("clients.modal.name_ph")} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.modal.sector")}</label>
                    <select value={form.sector ?? ""} onChange={field("sector")} className={inputCls}>
                      <option value="">{t("clients.modal.sector_ph")}</option>
                      {SECTORS.map((s) => (
                        <option key={s} value={s}>{lang === "fr" ? (SECTOR_LABELS[s] ?? s) : s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.forme_juridique")}</label>
                    <input type="text" value={form.formeJuridique ?? ""} onChange={field("formeJuridique")} className={inputCls} placeholder="SARL, SA, SAS..." />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.modal.phone")}</label>
                    <input type="tel" value={form.phone ?? ""} onChange={field("phone")} className={inputCls} placeholder="+216 XX XXX XXX" />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.modal.email")}</label>
                    <input type="email" value={form.email ?? ""} onChange={field("email")} className={inputCls} placeholder="contact@company.com" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>{t("clients.modal.address")}</label>
                    <input type="text" value={form.address ?? ""} onChange={field("address")} className={inputCls} placeholder={t("clients.modal.address_ph")} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.pays")}</label>
                    <input type="text" value={form.pays ?? ""} onChange={field("pays")} className={inputCls} placeholder="ex. Tunisie" />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.etat")}</label>
                    <input type="text" value={form.etat ?? ""} onChange={field("etat")} className={inputCls} placeholder="Actif / Inactif" />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.assigned_to")}</label>
                    <input type="text" value={form.assignedTo ?? ""} onChange={field("assignedTo")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>SIRET</label>
                    <input type="text" value={form.siret ?? ""} onChange={field("siret")} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>{t("clients.modal.notes")}</label>
                    <textarea value={form.notes ?? ""} onChange={field("notes")} rows={2} className={`${inputCls} resize-none`} placeholder={t("clients.modal.notes_ph")} />
                  </div>
                </div>
              </div>

              {/* ── Section: Legal & Tax ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3] pb-2 mb-3 border-b border-[#CACAC4] dark:border-white/[0.06]">
                  {t("clients.profile.section_legal")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t("clients.profile.tva_regime")}</label>
                    <input type="text" value={form.tvaRegime ?? ""} onChange={field("tvaRegime")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.tva_date")}</label>
                    <input type="date" value={form.tvaDate ? form.tvaDate.substring(0, 10) : ""} onChange={field("tvaDate")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.date_cloture")}</label>
                    <input type="date" value={form.dateCloture ? form.dateCloture.substring(0, 10) : ""} onChange={field("dateCloture")} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* ── Section: Portals ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3] pb-2 mb-3 border-b border-[#CACAC4] dark:border-white/[0.06]">
                  {t("clients.profile.section_portals")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t("clients.profile.espace_client")}</label>
                    <input type="text" value={form.espaceClient ?? ""} onChange={field("espaceClient")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.espace_extranet")}</label>
                    <input type="text" value={form.espaceExtranet ?? ""} onChange={field("espaceExtranet")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("clients.profile.idgrp")}</label>
                    <input type="text" value={form.idGrpIntTeams ?? ""} onChange={field("idGrpIntTeams")} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="flex justify-end gap-3 pt-2 border-t border-[#CACAC4] dark:border-white/[0.06]">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-black/[0.04] dark:bg-white/[0.04] transition">
                  {t("clients.modal.cancel")}
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white font-medium transition disabled:opacity-60">
                  {saving ? t("clients.modal.saving") : isEdit ? t("clients.modal.save_btn") : t("clients.modal.add_btn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ─── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0D0D0D] dark:text-white">{t("clients.import_title")}</h2>
              <button onClick={() => setShowImport(false)} className="text-[#9E9EA3] hover:text-[#9E9EA3] dark:hover:text-[#0D0D0D] dark:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importResult ? (
              <>
                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImportFile(f); }}
                  className="border-2 border-dashed border-[#CACAC4] dark:border-white/[0.06] rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[#CACAC4] dark:border-white/[0.06] dark:hover:border-[#CACAC4] dark:border-white/[0.06] transition"
                >
                  <Upload className="w-8 h-8 text-[#9E9EA3]" />
                  <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] font-medium">
                    {importFile ? importFile.name : t("clients.import_drop")}
                  </p>
                  <p className="text-xs text-[#9E9EA3]">{t("clients.import_hint")}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportFile(f); }}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-black/[0.04] dark:bg-white/[0.04] transition">
                    {t("clients.modal.cancel")}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="px-5 py-2 text-sm rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white font-medium transition disabled:opacity-50"
                  >
                    {importing ? t("clients.importing") : t("clients.import_btn")}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Result summary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="text-sm">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{importResult.imported}</span>
                      <span className="text-[#6B6B6F] dark:text-[#9E9EA3] ml-1">{t("clients.import_new")}</span>
                      <span className="mx-2 text-[#9E9EA3] dark:text-[#6B6B6F]">·</span>
                      <span className="font-semibold text-[#6B6B6F] dark:text-[#9E9EA3]">{importResult.updated}</span>
                      <span className="text-[#6B6B6F] dark:text-[#9E9EA3] ml-1">{t("clients.import_updated")}</span>
                      <span className="mx-2 text-[#9E9EA3] dark:text-[#6B6B6F]">·</span>
                      <span className="font-semibold text-[#9E9EA3]">{importResult.skipped}</span>
                      <span className="text-[#6B6B6F] dark:text-[#9E9EA3] ml-1">{t("clients.import_skipped")}</span>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 space-y-1">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-semibold mb-1">
                        <AlertCircle className="w-4 h-4" />
                        {importResult.errors.length} {t("clients.import_errors")}
                      </div>
                      {importResult.errors.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-xs text-red-500 dark:text-red-400 truncate">{e}</p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-xs text-red-400">+{importResult.errors.length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => { setShowImport(false); }} className="px-5 py-2 text-sm rounded-lg bg-[#FFD600]/10 hover:bg-[#FFD600]/10 text-white font-medium transition">
                    {t("clients.modal.close") ?? "Close"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Modal ─── */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-md p-8">
            <h2 className="text-lg font-bold text-[#0D0D0D] dark:text-white mb-2">{t("clients.modal.delete_title")}</h2>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] mb-1">
              {t("clients.modal.delete_confirm")} <strong>{toDelete.name}</strong>?
            </p>
            <p className="text-xs text-red-500 mb-6">{t("clients.modal.delete_warn")}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setToDelete(null)} className="px-4 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-black/[0.04] dark:bg-white/[0.04] transition">
                {t("clients.modal.cancel")}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition disabled:opacity-60">
                {deleting ? t("clients.modal.deleting") : t("clients.modal.delete_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
