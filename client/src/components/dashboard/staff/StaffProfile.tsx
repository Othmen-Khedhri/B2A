import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Mail, Building2, Briefcase,
  Calendar, FileText, User, MapPin, Heart, GraduationCap,
  Clock, TrendingUp, Save, X, BadgeCheck, Camera,
} from "lucide-react";
import api from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { getAvatarUrl } from "../../../utils/getAvatarUrl";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  academicLevel: string;
  specializations: string[];
  currentLoad: number;
  totalHours: number;
  burnoutFlags: { flagged: boolean; reasons: string[] };
  cin: string;
  cnss: string;
  gender: string;
  dateOfBirth?: string;
  placeOfBirth: string;
  address: string;
  civilStatus: string;
  children: number;
  hireDate?: string;
  contractType: string;
  contractEndDate?: string;
  department: string;
  positionCategory: string;
  coutHoraire: number;
  expStartDate?: string;
  avatarUrl?: string;
  createdAt: string;
}

const CONTRACT_TYPES = ["CDI", "CDD", "CIVP", "CIVP 2", "CAIP", "Sous-traitance", "Stage", "Autre"];
const DEPARTMENTS     = ["Comptabilité", "Audit", "Administration générale", "Service client", "IT", "Finance", "Autre"];
const POS_CATEGORIES  = ["Prod Team", "Prod Mgt", "B. Support", "Autre"];
const CIVIL_STATUSES  = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf/Veuve"];

const levelColor: Record<string, string> = {
  Junior:  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Mid:     "bg-[#FFD600]/10 text-[#FFD600] dark:bg-[#FFD600]/10 dark:text-[#FFD600]",
  Senior:  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Partner: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const roleColor: Record<string, string> = {
  admin:        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  manager:      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  collaborator: "bg-black/[0.04] text-[#9E9EA3] dark:bg-[#9E9EA3]/20 dark:text-[#9E9EA3]",
  worker:       "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

const avatarColor: Record<string, string> = {
  admin:        "bg-[#E2E2DC] dark:bg-[#2A2A2E]",
  manager:      "bg-[#E2E2DC] dark:bg-[#2A2A2E]",
  collaborator: "bg-[#E2E2DC] dark:bg-[#2A2A2E]",
  worker:       "bg-[#E2E2DC] dark:bg-[#2A2A2E]",
};

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const yearsAgo = (d?: string) => {
  if (!d) return null;
  const diff = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(diff);
};

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/* ── Info Row ────────────────────────────────────────────────────────────── */
const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) => {
  if (!value && value !== 0) return null;
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

/* ── Card wrapper ────────────────────────────────────────────────────────── */
const Card = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-[#2A2A2E] rounded-lg border border-[#CACAC4] dark:border-white/[0.06] p-6">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#6B6B6F] dark:text-[#9E9EA3]" />
      <h3 className="text-sm font-bold text-[#6B6B6F] dark:text-[#9E9EA3] uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

/* ── Load bar ────────────────────────────────────────────────────────────── */
const LoadBar = ({ load }: { load: number }) => {
  const pct = Math.min(Math.round((load / 160) * 100), 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-orange-400" : "bg-emerald-500";
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-[#0D0D0D] dark:text-white">{load}h</span>
        <span className="text-[#9E9EA3]">{pct}% capacity</span>
      </div>
      <div className="h-2.5 bg-black/[0.04] dark:bg-[#9E9EA3]/30 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-[#9E9EA3]">Based on 160h/month</p>
    </div>
  );
};

/* ── Edit Modal ──────────────────────────────────────────────────────────── */
const inputCls = "w-full px-4 py-2.5 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white outline-none focus:ring-2 focus:ring-[#FFD600]";
const labelCls = "block text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] mb-1";
const SectionTitle = ({ label }: { label: string }) => (
  <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3] pt-4 pb-1 border-b border-[#CACAC4] dark:border-white/[0.06]">{label}</p>
);

/* ── Main Page ───────────────────────────────────────────────────────────── */
const StaffProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/staff/${id}`);
      setMember(r.data);
    } catch {
      setMember(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [id]);

  const openEdit = () => {
    if (!member) return;
    setForm({
      name: member.name,
      email: member.email || "",
      password: "",
      role: member.role,
      level: member.level,
      academicLevel: member.academicLevel || "",
      specializations: member.specializations?.join(", ") || "",
      cin: member.cin || "",
      cnss: member.cnss || "",
      gender: member.gender || "",
      dateOfBirth: member.dateOfBirth ? member.dateOfBirth.substring(0, 10) : "",
      placeOfBirth: member.placeOfBirth || "",
      address: member.address || "",
      civilStatus: member.civilStatus || "",
      children: String(member.children ?? 0),
      hireDate: member.hireDate ? member.hireDate.substring(0, 10) : "",
      contractType: member.contractType || "",
      contractEndDate: member.contractEndDate ? member.contractEndDate.substring(0, 10) : "",
      department: member.department || "",
      positionCategory: member.positionCategory || "",
      expStartDate: member.expStartDate ? member.expStartDate.substring(0, 10) : "",
    });
    setFormError("");
    setShowEdit(true);
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    if (!member) return;
    setFormError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        children: Number(form.children),
        specializations: form.specializations ? form.specializations.split(",").map((s) => s.trim()).filter(Boolean) : [],
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        hireDate: form.hireDate || undefined,
        contractEndDate: form.contractEndDate || undefined,
        expStartDate: form.expStartDate || undefined,
      };
      if (!form.password) delete payload.password;
      await api.put(`/staff/${member._id}`, payload);
      setShowEdit(false);
      fetch();
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Error saving.");
    } finally { setSaving(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;
    if (file.size > 500 * 1024) {
      alert("Image must be under 500 KB.");
      e.target.value = "";
      return;
    }
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await api.post<{ avatarUrl: string }>(`/staff/${member._id}/avatar`, fd);
      setMember((m) => m ? { ...m, avatarUrl: res.data.avatarUrl } : m);
    } catch {
      alert("Upload failed. Image must be under 500 KB.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!member) return;
    try {
      await api.delete(`/staff/${member._id}`);
      navigate("/dashboard/staff");
    } catch {
      setShowDelete(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#CACAC4] dark:border-white/[0.06] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!member) return (
    <div className="text-center py-20 text-[#9E9EA3]">
      <p>Staff member not found.</p>
      <button onClick={() => navigate("/dashboard/staff")} className="mt-3 text-[#9E9EA3] hover:underline text-sm">← Back</button>
    </div>
  );

  const isWorker  = member.role === "worker";
  const yrsB2A    = yearsAgo(member.hireDate);
  const isSelf       = member._id === currentUser?.id;
  const isRootAdmin  = currentUser?.email?.toLowerCase() === "admin@b2a.com";
  const canDelete    = !isSelf && (member.role !== "admin" || isRootAdmin);
  const age      = yearsAgo(member.dateOfBirth);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Back + Actions ── */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/dashboard/staff")}
          className="flex items-center gap-2 text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white transition font-medium">
          <ArrowLeft className="w-4 h-4" /> {t("staff.profile.back")}
        </button>
        <div className="flex gap-2">
          <button onClick={openEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white transition">
            <Pencil className="w-4 h-4" /> {t("common.edit")}
          </button>
          <button
            onClick={() => canDelete && setShowDelete(true)}
            disabled={!canDelete}
            title={!canDelete ? "This account cannot be deleted" : undefined}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition ${canDelete ? "border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-[#CACAC4] dark:border-white/[0.06] text-[#9E9EA3] opacity-40 cursor-not-allowed"}`}
          >
            <Trash2 className="w-4 h-4" /> {t("common.delete")}
          </button>
        </div>
      </div>

      {/* ── Profile Header ── */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-lg border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
        {/* Banner with avatar pinned to bottom-left */}
        <div className={`relative h-32 bg-gradient-to-r ${avatarColor[member.role] ?? avatarColor.collaborator}`}>
          <div className="absolute -bottom-10 left-8">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="relative group w-20 h-20 rounded-lg border-4 border-white shadow-lg overflow-hidden block"
              title="Click to change photo"
            >
              {member.avatarUrl ? (
                <img
                  src={getAvatarUrl(member.avatarUrl)!}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center font-bold text-2xl text-white bg-gradient-to-br ${avatarColor[member.role] ?? avatarColor.collaborator}`}>
                  {initials(member.name)}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content — starts well below the avatar */}
        <div className="px-8 pt-14 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Name & badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{member.name}</h1>
                {member.burnoutFlags?.flagged && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    ⚠ Burnout risk
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-3 text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
                {member.specializations?.[0] && <span>{member.specializations[0]}</span>}
                {member.specializations?.[0] && member.department && <span className="text-[#9E9EA3] dark:text-[#9E9EA3]">·</span>}
                {member.department && <span>{member.department}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${roleColor[member.role] ?? ""}`}>
                  {member.role}
                </span>
                {!isWorker && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${levelColor[member.level] ?? ""}`}>
                    {member.level}
                  </span>
                )}
                {member.contractType && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.04] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]">
                    {member.contractType}
                  </span>
                )}
                {member.positionCategory && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.04] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]">
                    {member.positionCategory}
                  </span>
                )}
                {member.coutHoraire > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    {member.coutHoraire} DT/h
                  </span>
                )}
              </div>
            </div>

            {/* Years at B2A */}
            {yrsB2A !== null && (
              <div className="shrink-0 text-right bg-[#E2E2DC] dark:bg-[#9E9EA3]/30 rounded-lg px-5 py-3">
                <p className="text-3xl font-bold text-[#0D0D0D] dark:text-white">{yrsB2A}</p>
                <p className="text-xs text-[#9E9EA3] mt-0.5">{t("staff.profile.years_b2a")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Personal */}
        <Card title={t("staff.section.personal")} icon={User}>
          <InfoRow icon={BadgeCheck} label="CIN N°"    value={member.cin} />
          <InfoRow icon={BadgeCheck} label="CNSS N°"   value={member.cnss} />
          <InfoRow icon={User}       label={t("staff.card.gender")}   value={member.gender} />
          <InfoRow icon={Calendar}   label={t("staff.card.dob")}
            value={member.dateOfBirth ? `${fmt(member.dateOfBirth)}${age ? ` (${age} ans)` : ""}` : undefined} />
          <InfoRow icon={MapPin}     label={t("staff.card.pob")}      value={member.placeOfBirth} />
          <InfoRow icon={MapPin}     label={t("staff.card.address")}  value={member.address} />
          <InfoRow icon={Heart}      label={t("staff.card.civil")}
            value={member.civilStatus ? `${member.civilStatus} · ${member.children} enfant(s)` : undefined} />
        </Card>

        {/* Professional */}
        <Card title={t("staff.section.account")} icon={Briefcase}>
          {member.email && <InfoRow icon={Mail}           label="Email"                         value={member.email} />}
          {!isWorker    && <InfoRow icon={GraduationCap}  label={t("staff.modal.academic")}     value={member.academicLevel} />}
          {member.specializations?.length > 0 && (
            <InfoRow icon={Briefcase} label={t("staff.modal.specializations")}
              value={member.specializations.join(", ")} />
          )}
          <InfoRow icon={Calendar}   label={t("staff.card.exp")}       value={fmt(member.expStartDate)} />
          <InfoRow icon={Building2}  label={t("staff.modal.department")}  value={member.department} />
          <InfoRow icon={FileText}   label={t("staff.modal.pos_category")} value={member.positionCategory} />
        </Card>

        {/* Contract */}
        <Card title={t("staff.section.contract")} icon={FileText}>
          <InfoRow icon={Calendar}  label={t("staff.modal.hire_date")}      value={fmt(member.hireDate)} />
          <InfoRow icon={FileText}  label={t("staff.modal.contract_type")}  value={member.contractType} />
          {member.contractEndDate && (
            <InfoRow icon={Calendar} label={t("staff.modal.contract_end")} value={fmt(member.contractEndDate)} />
          )}
        </Card>

        {/* Workload */}
        {!isWorker && (
          <Card title={t("staff.profile.workload")} icon={TrendingUp}>
            <p className="text-xs text-[#9E9EA3] mb-4">{t("staff.profile.current_month")}</p>
            <LoadBar load={member.currentLoad} />
            <div className="mt-5 pt-4 border-t border-[#CACAC4] dark:border-white/[0.06] flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#9E9EA3]" />
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white">{member.totalHours}h</p>
                <p className="text-xs text-[#9E9EA3]">{t("staff.profile.total_logged")}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {showEdit && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white dark:bg-[#2A2A2E] flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#CACAC4] dark:border-white/[0.06] z-10">
              <h3 className="text-lg font-bold text-[#0D0D0D] dark:text-white">{t("staff.modal.edit_title")} — {member.name}</h3>
              <button onClick={() => setShowEdit(false)} className="text-[#9E9EA3] hover:text-[#9E9EA3] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-8 pb-8 pt-5 space-y-4">
              {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">{formError}</p>}

              <SectionTitle label={t("staff.section.account")} />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={labelCls}>{t("staff.modal.name")}</label><input value={form.name} onChange={f("name")} className={inputCls} /></div>
                {form.role !== "worker" && <>
                  <div className="col-span-2"><label className={labelCls}>{t("staff.modal.email")}</label><input type="email" value={form.email} onChange={f("email")} className={inputCls} /></div>
                  <div className="col-span-2"><label className={labelCls}>{t("staff.modal.password_edit")}</label><input type="password" value={form.password} onChange={f("password")} className={inputCls} placeholder="Leave blank to keep" /></div>
                </>}
                <div><label className={labelCls}>{t("staff.modal.role")}</label>
                  <select value={form.role} onChange={f("role")} className={inputCls}>
                    {["collaborator","manager","admin","worker"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {form.role !== "worker" && <div><label className={labelCls}>{t("staff.modal.level")}</label>
                  <select value={form.level} onChange={f("level")} className={inputCls}>
                    {["Junior","Mid","Senior","Partner"].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>}
                {form.role !== "worker" && <div className="col-span-2"><label className={labelCls}>{t("staff.modal.academic")}</label><input value={form.academicLevel} onChange={f("academicLevel")} className={inputCls} /></div>}
                <div className="col-span-2"><label className={labelCls}>{t("staff.modal.specializations")}</label><input value={form.specializations} onChange={f("specializations")} className={inputCls} /></div>
              </div>

              <SectionTitle label={t("staff.section.personal")} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>CIN N°</label><input value={form.cin} onChange={f("cin")} className={inputCls} /></div>
                <div><label className={labelCls}>CNSS N°</label><input value={form.cnss} onChange={f("cnss")} className={inputCls} /></div>
                <div><label className={labelCls}>{t("staff.modal.gender")}</label>
                  <select value={form.gender} onChange={f("gender")} className={inputCls}>
                    <option value="">—</option><option value="Male">Male / Homme</option><option value="Female">Female / Femme</option>
                  </select>
                </div>
                <div><label className={labelCls}>{t("staff.modal.civil_status")}</label>
                  <select value={form.civilStatus} onChange={f("civilStatus")} className={inputCls}>
                    <option value="">—</option>{CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>{t("staff.modal.dob")}</label><input type="date" value={form.dateOfBirth} onChange={f("dateOfBirth")} className={inputCls} /></div>
                <div><label className={labelCls}>{t("staff.modal.pob")}</label><input value={form.placeOfBirth} onChange={f("placeOfBirth")} className={inputCls} /></div>
                <div><label className={labelCls}>{t("staff.modal.children")}</label><input type="number" min={0} value={form.children} onChange={f("children")} className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>{t("staff.modal.address")}</label><input value={form.address} onChange={f("address")} className={inputCls} /></div>
              </div>

              <SectionTitle label={t("staff.section.contract")} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>{t("staff.modal.hire_date")}</label><input type="date" value={form.hireDate} onChange={f("hireDate")} className={inputCls} /></div>
                <div><label className={labelCls}>{t("staff.modal.contract_type")}</label>
                  <select value={form.contractType} onChange={f("contractType")} className={inputCls}>
                    <option value="">—</option>{CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>{t("staff.modal.contract_end")}</label><input type="date" value={form.contractEndDate} onChange={f("contractEndDate")} className={inputCls} /></div>
                <div><label className={labelCls}>{t("staff.modal.exp_start")}</label><input type="date" value={form.expStartDate} onChange={f("expStartDate")} className={inputCls} /></div>
                <div><label className={labelCls}>{t("staff.modal.department")}</label>
                  <select value={form.department} onChange={f("department")} className={inputCls}>
                    <option value="">—</option>{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>{t("staff.modal.pos_category")}</label>
                  <select value={form.positionCategory} onChange={f("positionCategory")} className={inputCls}>
                    <option value="">—</option>{POS_CATEGORIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>{t("staff.modal.cout_horaire")}</label>
                  <input type="number" min={0} value={form.coutHoraire ?? "0"} onChange={f("coutHoraire")} className={inputCls} placeholder="ex. 20" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#0D0D0D] dark:hover:bg-[#9E9EA3]/20 transition">
                  {t("staff.modal.cancel")}
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? t("staff.modal.saving") : t("staff.modal.save_btn")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirm ── */}
      {showDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDelete(false)} />
          <div className="relative bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-md p-8 z-10">
            <h3 className="text-lg font-bold text-[#0D0D0D] dark:text-white mb-2">{t("staff.modal.delete_title")}</h3>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] mb-1">
              {t("staff.modal.delete_confirm")} <strong>{member.name}</strong>?
            </p>
            <p className="text-xs text-red-500 mb-6">{t("staff.modal.delete_warn")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#0D0D0D] dark:hover:bg-[#9E9EA3]/20 transition">
                {t("staff.modal.cancel")}
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition">
                <Trash2 className="w-4 h-4" /> {t("staff.modal.delete_btn")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StaffProfile;
