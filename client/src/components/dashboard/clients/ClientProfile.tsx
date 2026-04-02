import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, X, Save,
  Building2, Phone, Mail, MapPin, FileText,
  Hash, Globe, Calendar, Briefcase, User, Tag,
} from "lucide-react";
import api from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";

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
  tvaDate?: string;
  dateCloture?: string;
  etat: string;
  pays: string;
  assignedTo: string;
  externalId: string;
  idGrpIntTeams: string;
  createdAt: string;
}

const SECTORS = [
  "Accounting","Finance","Legal","Healthcare","Real Estate",
  "Retail","Technology","Manufacturing","Construction","Education",
  "Hospitality","Transport","Other",
];

const SECTOR_COLORS: Record<string, string> = {
  Accounting:    "bg-[#FFD600]",
  Finance:       "from-emerald-500 to-teal-600",
  Legal:         "from-purple-500 to-fuchsia-600",
  Healthcare:    "from-rose-500 to-pink-600",
  "Real Estate": "from-amber-500 to-orange-600",
  Retail:        "from-sky-500 to-blue-600",
  Technology:    "from-[#9E9EA3] to-[#0D0D0D]",
  Manufacturing: "from-orange-500 to-amber-600",
  Construction:  "from-yellow-500 to-amber-600",
  Education:     "from-teal-500 to-emerald-600",
  Hospitality:   "from-pink-500 to-rose-600",
  Transport:     "from-cyan-500 to-sky-600",
  Other:         "from-[#9E9EA3] to-[#0D0D0D]",
};

const SECTOR_BADGE: Record<string, string> = {
  Accounting:    "bg-[#FFD600]/10 text-[#FFD600] dark:bg-[#FFD600]/10 dark:text-[#FFD600]",
  Finance:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Legal:         "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Healthcare:    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "Real Estate": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Retail:        "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Technology:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Manufacturing: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Construction:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Education:     "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Hospitality:   "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Transport:     "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Other:         "bg-black/[0.04] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]",
};

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/* ── Info Row ─────────────────────────────────────────────────────────────── */
const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#CACAC4] dark:border-white/[0.06] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-[#9E9EA3]/30 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[#6B6B6F] dark:text-[#9E9EA3]" />
      </div>
      <div>
        <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">{label}</p>
        <p className="text-sm font-medium text-[#0D0D0D] dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
};

/* ── Card ─────────────────────────────────────────────────────────────────── */
const Card = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-[#2A2A2E] rounded-lg border border-[#CACAC4] dark:border-white/[0.06] p-6">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#6B6B6F] dark:text-[#9E9EA3]" />
      <h3 className="text-sm font-bold text-[#6B6B6F] dark:text-[#9E9EA3] uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

/* ── Styles ───────────────────────────────────────────────────────────────── */
const inputCls = "w-full px-4 py-2.5 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white outline-none focus:ring-2 focus:ring-[#FFD600]";
const labelCls = "block text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] mb-1";
const SectionTitle = ({ label }: { label: string }) => (
  <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3] pt-4 pb-1 border-b border-[#CACAC4] dark:border-white/[0.06]">{label}</p>
);

/* ── Main Page ────────────────────────────────────────────────────────────── */
const ClientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/clients/${id}`);
      setClient(r.data);
    } catch {
      setClient(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    if (!client) return;
    setForm({ ...client });
    setFormError("");
    setShowEdit(true);
  };

  const f = (key: keyof Client) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    if (!client) return;
    setFormError("");
    setSaving(true);
    try {
      await api.put(`/clients/${client._id}`, form);
      setShowEdit(false);
      load();
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("clients.modal.error"));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!client) return;
    try {
      await api.delete(`/clients/${client._id}`);
      navigate("/dashboard/clients");
    } catch {
      setShowDelete(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#CACAC4] dark:border-white/[0.06] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!client) return (
    <div className="text-center py-20 text-[#9E9EA3]">
      <p>Client not found.</p>
      <button onClick={() => navigate("/dashboard/clients")} className="mt-3 text-[#9E9EA3] hover:underline text-sm">← Back</button>
    </div>
  );

  const gradient = SECTOR_COLORS[client.sector] ?? SECTOR_COLORS["Other"];
  const badge    = SECTOR_BADGE[client.sector]  ?? SECTOR_BADGE["Other"];
  const sectorLabel = lang === "fr"
    ? ({ Accounting:"Comptabilité", Finance:"Finance", Legal:"Juridique", Healthcare:"Santé",
         "Real Estate":"Immobilier", Retail:"Commerce", Technology:"Technologie",
         Manufacturing:"Industrie", Construction:"Construction", Education:"Éducation",
         Hospitality:"Hôtellerie", Transport:"Transport", Other:"Autre" }[client.sector] ?? client.sector)
    : client.sector;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Back + Actions ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard/clients")}
          className="flex items-center gap-2 text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> {t("clients.profile.back")}
        </button>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white transition"
          >
            <Pencil className="w-4 h-4" /> {t("common.edit")}
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 className="w-4 h-4" /> {t("common.delete")}
          </button>
        </div>
      </div>

      {/* ── Profile Header ── */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-lg border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
        <div className={`relative h-32 bg-gradient-to-r ${gradient}`}>
          <div className={`absolute -bottom-10 left-8 w-20 h-20 rounded-lg border-4 border-white flex items-center justify-center text-white font-bold text-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
            {initials(client.name)}
          </div>
        </div>

        <div className="px-8 pt-14 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#0D0D0D] dark:text-white mb-2">{client.name}</h1>
              <div className="flex flex-wrap gap-2">
                {client.sector && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge}`}>
                    {sectorLabel}
                  </span>
                )}
                {client.formeJuridique && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.04] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]">
                    {client.formeJuridique}
                  </span>
                )}
                {client.etat && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    client.etat.toLowerCase().includes("actif") || client.etat.toLowerCase().includes("active")
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-black/[0.04] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]"
                  }`}>
                    {client.etat}
                  </span>
                )}
                {client.pays && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.04] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]">
                    {client.pays}
                  </span>
                )}
              </div>
            </div>

            {client.externalId && (
              <div className="shrink-0 text-right bg-[#E2E2DC] dark:bg-[#9E9EA3]/30 rounded-lg px-5 py-3">
                <p className="text-xs text-[#9E9EA3] mb-1">ID</p>
                <p className="text-sm font-mono font-bold text-[#6B6B6F] dark:text-[#9E9EA3]">{client.externalId}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Info Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Contact */}
        <Card title={t("clients.profile.contact")} icon={Phone}>
          <InfoRow icon={Phone}   label={t("clients.modal.phone")}   value={client.phone} />
          <InfoRow icon={Mail}    label={t("clients.modal.email")}   value={client.email} />
          <InfoRow icon={MapPin}  label={t("clients.modal.address")} value={client.address} />
          <InfoRow icon={Globe}   label={t("clients.profile.pays")}  value={client.pays} />
        </Card>

        {/* Business */}
        <Card title={t("clients.profile.business")} icon={Building2}>
          <InfoRow icon={Briefcase} label={t("clients.modal.sector")}         value={sectorLabel} />
          <InfoRow icon={Tag}       label={t("clients.profile.forme_juridique")} value={client.formeJuridique} />
          <InfoRow icon={Hash}      label="SIRET"                              value={client.siret} />
          <InfoRow icon={User}      label={t("clients.profile.assigned_to")}  value={client.assignedTo} />
        </Card>

        {/* Tax & Dates */}
        <Card title={t("clients.profile.legal")} icon={FileText}>
          <InfoRow icon={FileText}  label={t("clients.profile.tva_regime")}   value={client.tvaRegime} />
          <InfoRow icon={Calendar}  label={t("clients.profile.tva_date")}     value={client.tvaDate ? fmt(client.tvaDate) : null} />
          <InfoRow icon={Calendar}  label={t("clients.profile.date_cloture")} value={client.dateCloture ? fmt(client.dateCloture) : null} />
          <InfoRow icon={Hash}      label={t("clients.profile.idgrp")}        value={client.idGrpIntTeams} />
        </Card>

        {/* Portals & Notes */}
        <Card title={t("clients.profile.portals")} icon={Globe}>
          <InfoRow icon={Globe}    label={t("clients.profile.espace_client")}   value={client.espaceClient} />
          <InfoRow icon={Globe}    label={t("clients.profile.espace_extranet")} value={client.espaceExtranet} />
          {client.notes && (
            <div className="mt-3 pt-3 border-t border-[#CACAC4] dark:border-white/[0.06]">
              <p className="text-xs text-[#9E9EA3] mb-1">{t("clients.modal.notes")}</p>
              <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] leading-relaxed">{client.notes}</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Edit Modal ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-[#2A2A2E] flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#CACAC4] dark:border-white/[0.06] z-10">
              <h3 className="text-lg font-bold text-[#0D0D0D] dark:text-white">{t("clients.modal.edit_title")} — {client.name}</h3>
              <button onClick={() => setShowEdit(false)} className="text-[#9E9EA3] hover:text-[#9E9EA3] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-8 pb-8 pt-5 space-y-4">
              {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">{formError}</p>}

              <SectionTitle label={t("clients.profile.section_main")} />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>{t("clients.modal.name")} *</label>
                  <input value={form.name ?? ""} onChange={f("name")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.modal.sector")}</label>
                  <select value={form.sector ?? ""} onChange={f("sector")} className={inputCls}>
                    <option value="">{t("clients.modal.sector_ph")}</option>
                    {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.forme_juridique")}</label>
                  <input value={form.formeJuridique ?? ""} onChange={f("formeJuridique")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.modal.phone")}</label>
                  <input value={form.phone ?? ""} onChange={f("phone")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.modal.email")}</label>
                  <input type="email" value={form.email ?? ""} onChange={f("email")} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>{t("clients.modal.address")}</label>
                  <input value={form.address ?? ""} onChange={f("address")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.pays")}</label>
                  <input value={form.pays ?? ""} onChange={f("pays")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.etat")}</label>
                  <input value={form.etat ?? ""} onChange={f("etat")} className={inputCls} />
                </div>
              </div>

              <SectionTitle label={t("clients.profile.section_legal")} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>SIRET</label>
                  <input value={form.siret ?? ""} onChange={f("siret")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.tva_regime")}</label>
                  <input value={form.tvaRegime ?? ""} onChange={f("tvaRegime")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.tva_date")}</label>
                  <input type="date" value={form.tvaDate ? form.tvaDate.substring(0, 10) : ""} onChange={f("tvaDate")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.date_cloture")}</label>
                  <input type="date" value={form.dateCloture ? form.dateCloture.substring(0, 10) : ""} onChange={f("dateCloture")} className={inputCls} />
                </div>
              </div>

              <SectionTitle label={t("clients.profile.section_portals")} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("clients.profile.espace_client")}</label>
                  <input value={form.espaceClient ?? ""} onChange={f("espaceClient")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.espace_extranet")}</label>
                  <input value={form.espaceExtranet ?? ""} onChange={f("espaceExtranet")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.assigned_to")}</label>
                  <input value={form.assignedTo ?? ""} onChange={f("assignedTo")} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("clients.profile.idgrp")}</label>
                  <input value={form.idGrpIntTeams ?? ""} onChange={f("idGrpIntTeams")} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>{t("clients.modal.notes")}</label>
                  <textarea rows={3} value={form.notes ?? ""} onChange={f("notes")} className={`${inputCls} resize-none`} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#0D0D0D] dark:hover:bg-[#9E9EA3]/20 transition">
                  {t("clients.modal.cancel")}
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? t("clients.modal.saving") : t("clients.modal.save_btn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDelete(false)} />
          <div className="relative bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-md p-8 z-10">
            <h3 className="text-lg font-bold text-[#0D0D0D] dark:text-white mb-2">{t("clients.modal.delete_title")}</h3>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] mb-1">
              {t("clients.modal.delete_confirm")} <strong>{client.name}</strong>?
            </p>
            <p className="text-xs text-red-500 mb-6">{t("clients.modal.delete_warn")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#0D0D0D] dark:hover:bg-[#9E9EA3]/20 transition">
                {t("clients.modal.cancel")}
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition">
                <Trash2 className="w-4 h-4" /> {t("clients.modal.delete_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProfile;
