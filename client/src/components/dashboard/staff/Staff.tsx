import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search, AlertTriangle, Plus, Pencil, Trash2, X, Save, ArrowRight,
  Building2, Mail, Calendar, Wrench, TrendingUp,
} from "lucide-react";
import api from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";

type Tab = "collaborator" | "manager" | "admin" | "worker";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  academicLevel: string;
  specializations: string[];
  coutHoraire: number;
  currentLoad: number;
  totalHours: number;
  burnoutFlags: { flagged: boolean; reasons: string[] };
  // HR
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
  expStartDate?: string;
  avatarUrl?: string;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "collaborator" as string,
  level: "Junior" as string,
  academicLevel: "",
  specializations: "",
  cin: "",
  cnss: "",
  gender: "",
  dateOfBirth: "",
  placeOfBirth: "",
  address: "",
  civilStatus: "",
  children: "0",
  hireDate: "",
  contractType: "",
  contractEndDate: "",
  department: "",
  positionCategory: "",
  expStartDate: "",
  coutHoraire: "0",
};

const TABS: { key: Tab; tKey: string }[] = [
  { key: "collaborator", tKey: "staff.collaborators" },
  { key: "manager",      tKey: "staff.managers" },
  { key: "admin",        tKey: "staff.admins" },
  { key: "worker",       tKey: "staff.workers" },
];

const CONTRACT_TYPES = ["CDI", "CDD", "CIVP", "CIVP 2", "CAIP", "Sous-traitance", "Stage", "Autre"];
const DEPARTMENTS     = ["Comptabilité", "Audit", "Administration générale", "Service client", "IT", "Finance", "Autre"];
const POS_CATEGORIES  = ["Prod Team", "Prod Mgt", "B. Support", "Autre"];
const CIVIL_STATUSES  = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf/Veuve"];

const levelColor: Record<string, string> = {
  Junior:  "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Mid:     "bg-[#FFD600]/10 text-[#FFD600] dark:bg-[#FFD600]/10 dark:text-[#FFD600]",
  Senior:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Partner: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const LoadBar
 = ({ load }: { load: number }) => {
  const pct = Math.min(Math.round((load / 160) * 100), 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-orange-400" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
        <span>{load}h this month</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-black/[0.04] dark:bg-white/[0.06] dark:bg-[#9E9EA3]/30 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// Role-based accent colors
const roleStyle: Record<string, { avatar: string; text: string; strip: string; iconBg: string; iconText: string; tabActive: string; tabText: string }> = {
  admin:        { avatar: "bg-violet-600", text: "text-white",       strip: "from-violet-500 to-purple-400",  iconBg: "bg-violet-100 dark:bg-violet-900/30", iconText: "text-violet-600 dark:text-violet-400", tabActive: "bg-violet-600", tabText: "text-white"       },
  manager:      { avatar: "bg-[#FFD600]",  text: "text-[#0D0D0D]",  strip: "from-[#FFD600] to-amber-300",    iconBg: "bg-amber-100 dark:bg-amber-900/30",   iconText: "text-amber-600 dark:text-amber-400",  tabActive: "bg-[#FFD600]",  tabText: "text-[#0D0D0D]"  },
  collaborator: { avatar: "bg-sky-600",    text: "text-white",       strip: "from-sky-500 to-blue-400",       iconBg: "bg-sky-100 dark:bg-sky-900/30",       iconText: "text-sky-600 dark:text-sky-400",      tabActive: "bg-sky-600",    tabText: "text-white"       },
  worker:       { avatar: "bg-teal-600",   text: "text-white",       strip: "from-teal-500 to-emerald-400",   iconBg: "bg-teal-100 dark:bg-teal-900/30",     iconText: "text-teal-600 dark:text-teal-400",    tabActive: "bg-teal-600",   tabText: "text-white"       },
};

/* ── Staff Card ─────────────────────────────────────────────────────────── */
const StaffCard = ({
  member, isWorker, onEdit, onDelete, canDelete,
}: {
  member: StaffMember;
  isWorker?: boolean;
  onEdit: (m: StaffMember) => void;
  onDelete: (m: StaffMember) => void;
  canDelete: boolean;
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const initials = member.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const jobTitle = member.specializations?.[0] || "";

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col">
      {/* Colored top strip */}
      <div className={`h-1.5 bg-gradient-to-r ${roleStyle[member.role]?.strip ?? roleStyle.collaborator.strip}`} />

      <div className="p-6 flex-1 space-y-5">
        {/* Header: avatar + name + badges */}
        <div className="flex items-start gap-4">
          {member.avatarUrl ? (
            <img
              src={`http://localhost:5000${member.avatarUrl}`}
              alt={member.name}
              className="w-14 h-14 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${roleStyle[member.role]?.avatar ?? roleStyle.collaborator.avatar} ${roleStyle[member.role]?.text ?? roleStyle.collaborator.text}`}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#0D0D0D] dark:text-white text-base truncate">{member.name}</p>
            {jobTitle && <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] truncate mt-0.5 font-medium">{jobTitle}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {!isWorker && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${levelColor[member.level] || ""}`}>
                  {member.level}
                </span>
              )}
              {member.contractType && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/[0.04] dark:bg-white/[0.06] text-[#9E9EA3] dark:bg-[#9E9EA3]/30 dark:text-[#9E9EA3]">
                  {member.contractType}
                </span>
              )}
              {member.coutHoraire > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {member.coutHoraire} DT/h
                </span>
              )}
              {member.burnoutFlags?.flagged && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" /> Burnout
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info rows */}
        {(() => {
          const rs = roleStyle[member.role] ?? roleStyle.collaborator;
          return (
            <div className="space-y-2.5">
              {member.department && (
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${rs.iconBg}`}>
                    <Building2 className={`w-4 h-4 ${rs.iconText}`} />
                  </div>
                  <span className="text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] truncate">{member.department}</span>
                </div>
              )}
              {member.email && !isWorker && (
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${rs.iconBg}`}>
                    <Mail className={`w-4 h-4 ${rs.iconText}`} />
                  </div>
                  <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] truncate">{member.email}</span>
                </div>
              )}
              {member.hireDate && (
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${rs.iconBg}`}>
                    <Calendar className={`w-4 h-4 ${rs.iconText}`} />
                  </div>
                  <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">{t("staff.card.hired")}: {formatDate(member.hireDate)}</span>
                </div>
              )}
              {isWorker && (
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${rs.iconBg}`}>
                    <Wrench className={`w-4 h-4 ${rs.iconText}`} />
                  </div>
                  <span className="text-sm italic text-[#9E9EA3]">{t("staff.support_staff")}</span>
                </div>
              )}
            </div>
          );
        })()}

        {!isWorker && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#9E9EA3]">
              <TrendingUp className="w-4 h-4" />
              <span>{t("staff.this_month")}</span>
            </div>
            <LoadBar load={member.currentLoad} />
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="border-t border-[#CACAC4] dark:border-white/[0.06] grid grid-cols-3">
        <button onClick={() => onEdit(member)}
          className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#1A1A1D] dark:hover:bg-[#9E9EA3]/30 transition-colors">
          <Pencil className="w-4 h-4" /> {t("common.edit")}
        </button>
        <button onClick={() => navigate(`/dashboard/staff/${member._id}`)}
          className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-black/[0.04] dark:bg-white/[0.04] transition-colors border-x border-[#CACAC4] dark:border-white/[0.06]">
          <ArrowRight className="w-4 h-4" /> {t("staff.card.profile")}
        </button>
        <button
          onClick={() => canDelete && onDelete(member)}
          disabled={!canDelete}
          title={!canDelete ? "This account cannot be deleted" : undefined}
          className={`flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${canDelete ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-[#9E9EA3] cursor-not-allowed opacity-40"}`}
        >
          <Trash2 className="w-4 h-4" /> {t("common.delete")}
        </button>
      </div>
    </div>
  );
};

/* ── Modal wrapper ───────────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) =>
  createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#2A2A2E] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
        <div className="sticky top-0 bg-white dark:bg-[#2A2A2E] flex items-center justify-between px-8 pt-7 pb-4 border-b border-[#CACAC4] dark:border-white/[0.06] z-10">
          <h3 className="text-lg font-bold text-[#0D0D0D] dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-[#9E9EA3] hover:text-[#9E9EA3] dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-8 pb-8 pt-5">{children}</div>
      </div>
    </div>,
    document.body
  );

/* ── Section header ──────────────────────────────────────────────────────── */
const SectionTitle = ({ label }: { label: string }) => (
  <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3] mb-3 mt-5 border-b border-[#CACAC4] dark:border-white/[0.06] pb-1">
    {label}
  </p>
);

/* ── Input helpers ───────────────────────────────────────────────────────── */
const inputCls = "w-full px-4 py-2.5 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white outline-none focus:ring-2 focus:ring-[#FFD600]";
const labelCls = "block text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] mb-1.5";

/* ── Main Component ──────────────────────────────────────────────────────── */
const Staff = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>("collaborator");
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<StaffMember | null>(null);
  const [form, setForm]   = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");

  const fetchStaff = () => {
    setLoading(true);
    api.get(`/staff?role=${tab}${search ? `&search=${search}` : ""}`)
      .then((r) => setMembers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, [tab, search]);

  const f = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  /* ── Open modals ── */
  const openAdd = () => {
    setForm({ ...EMPTY_FORM, role: tab });
    setFormError("");
    setShowAddModal(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditingMember(m);
    setForm({
      name: m.name,
      email: m.email || "",
      password: "",
      role: m.role,
      level: m.level,
      academicLevel: m.academicLevel || "",
      specializations: m.specializations?.join(", ") || "",
      cin: m.cin || "",
      cnss: m.cnss || "",
      gender: m.gender || "",
      dateOfBirth: m.dateOfBirth ? m.dateOfBirth.substring(0, 10) : "",
      placeOfBirth: m.placeOfBirth || "",
      address: m.address || "",
      civilStatus: m.civilStatus || "",
      children: String(m.children ?? 0),
      hireDate: m.hireDate ? m.hireDate.substring(0, 10) : "",
      contractType: m.contractType || "",
      contractEndDate: m.contractEndDate ? m.contractEndDate.substring(0, 10) : "",
      department: m.department || "",
      positionCategory: m.positionCategory || "",
      expStartDate: m.expStartDate ? m.expStartDate.substring(0, 10) : "",
      coutHoraire: String(m.coutHoraire ?? 0),
    });
    setFormError("");
  };

  const buildPayload = () => ({
    name: form.name,
    email: form.email || undefined,
    role: form.role,
    level: form.level,
    academicLevel: form.academicLevel,
    specializations: form.specializations ? form.specializations.split(",").map((s) => s.trim()).filter(Boolean) : [],
    cin: form.cin,
    cnss: form.cnss,
    gender: form.gender,
    dateOfBirth: form.dateOfBirth || undefined,
    placeOfBirth: form.placeOfBirth,
    address: form.address,
    civilStatus: form.civilStatus,
    children: Number(form.children),
    hireDate: form.hireDate || undefined,
    contractType: form.contractType,
    contractEndDate: form.contractEndDate || undefined,
    department: form.department,
    positionCategory: form.positionCategory,
    expStartDate: form.expStartDate || undefined,
    coutHoraire: Number(form.coutHoraire) || 0,
  });

  /* ── Add ── */
  const handleAdd = async () => {
    setFormError("");
    const isWorker = form.role === "worker";
    if (!form.name) { setFormError(t("staff.modal.name_required")); return; }
    if (!isWorker && (!form.email || !form.password)) { setFormError(t("staff.modal.email_pw_required")); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (form.password) (payload as Record<string, unknown>).password = form.password;
      await api.post("/staff", payload);
      setShowAddModal(false);
      fetchStaff();
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("staff.modal.error"));
    } finally { setSaving(false); }
  };

  /* ── Edit ── */
  const handleEdit = async () => {
    if (!editingMember) return;
    setFormError("");
    setSaving(true);
    try {
      const payload = buildPayload();
      if (form.password) (payload as Record<string, unknown>).password = form.password;
      await api.put(`/staff/${editingMember._id}`, payload);
      setEditingMember(null);
      fetchStaff();
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("staff.modal.error"));
    } finally { setSaving(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deletingMember) return;
    try {
      await api.delete(`/staff/${deletingMember._id}`);
      setDeletingMember(null);
      fetchStaff();
    } catch { alert("Failed to delete."); }
  };

  /* ── Form ── */
  const renderForm = (isEdit = false) => (
    <div>
      {formError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg mb-4">{formError}</p>
      )}

      {/* ── Account ── */}
      <SectionTitle label={t("staff.section.account")} />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>{t("staff.modal.name")}</label>
          <input value={form.name} onChange={f("name")} className={inputCls} placeholder="e.g. Ahmed Ben Ali" />
        </div>

        {form.role !== "worker" && (
          <>
            <div className="col-span-2">
              <label className={labelCls}>{t("staff.modal.email")}</label>
              <input type="email" value={form.email} onChange={f("email")} className={inputCls} placeholder="email@b2a.com" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{isEdit ? t("staff.modal.password_edit") : t("staff.modal.password")}</label>
              <input type="password" value={form.password} onChange={f("password")} className={inputCls} placeholder={isEdit ? "Leave blank to keep" : "Min. 8 characters"} />
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>{t("staff.modal.role")}</label>
          <select value={form.role} onChange={f("role")} className={inputCls}>
            <option value="collaborator">Collaborator</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="worker">Worker</option>
          </select>
        </div>

        {form.role !== "worker" && (
          <div>
            <label className={labelCls}>{t("staff.modal.level")}</label>
            <select value={form.level} onChange={f("level")} className={inputCls}>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
              <option value="Partner">Partner</option>
            </select>
          </div>
        )}

        {form.role !== "worker" && (
          <div className="col-span-2">
            <label className={labelCls}>{t("staff.modal.academic")}</label>
            <input value={form.academicLevel} onChange={f("academicLevel")} className={inputCls} placeholder="e.g. Master en Comptabilité" />
          </div>
        )}

        <div className="col-span-2">
          <label className={labelCls}>{t("staff.modal.specializations")} <span className="text-[#9E9EA3] font-normal">{t("staff.modal.spec_hint")}</span></label>
          <input value={form.specializations} onChange={f("specializations")} className={inputCls} placeholder="e.g. Comptable Senior, Audit" />
        </div>
      </div>

      {/* ── Personal ── */}
      <SectionTitle label={t("staff.section.personal")} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>CIN N°</label>
          <input value={form.cin} onChange={f("cin")} className={inputCls} placeholder="ex. 04718541" />
        </div>
        <div>
          <label className={labelCls}>CNSS N°</label>
          <input value={form.cnss} onChange={f("cnss")} className={inputCls} placeholder="ex. 17223740-04" />
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.gender")}</label>
          <select value={form.gender} onChange={f("gender")} className={inputCls}>
            <option value="">—</option>
            <option value="Male">Male / Homme</option>
            <option value="Female">Female / Femme</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.civil_status")}</label>
          <select value={form.civilStatus} onChange={f("civilStatus")} className={inputCls}>
            <option value="">—</option>
            {CIVIL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.dob")}</label>
          <input type="date" value={form.dateOfBirth} onChange={f("dateOfBirth")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.pob")}</label>
          <input value={form.placeOfBirth} onChange={f("placeOfBirth")} className={inputCls} placeholder="ex. Tunis" />
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.children")}</label>
          <input type="number" min={0} value={form.children} onChange={f("children")} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{t("staff.modal.address")}</label>
          <input value={form.address} onChange={f("address")} className={inputCls} placeholder="ex. 12 Rue de la République, Tunis" />
        </div>
      </div>

      {/* ── Contract ── */}
      <SectionTitle label={t("staff.section.contract")} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("staff.modal.hire_date")}</label>
          <input type="date" value={form.hireDate} onChange={f("hireDate")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.contract_type")}</label>
          <select value={form.contractType} onChange={f("contractType")} className={inputCls}>
            <option value="">—</option>
            {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.contract_end")}</label>
          <input type="date" value={form.contractEndDate} onChange={f("contractEndDate")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.exp_start")}</label>
          <input type="date" value={form.expStartDate} onChange={f("expStartDate")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.department")}</label>
          <select value={form.department} onChange={f("department")} className={inputCls}>
            <option value="">—</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.pos_category")}</label>
          <select value={form.positionCategory} onChange={f("positionCategory")} className={inputCls}>
            <option value="">—</option>
            {POS_CATEGORIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("staff.modal.cout_horaire")}</label>
          <input type="number" min={0} value={form.coutHoraire} onChange={f("coutHoraire")} className={inputCls} placeholder="ex. 20" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-white dark:bg-[#2A2A2E] p-1 rounded-lg border border-[#CACAC4] dark:border-white/[0.06]">
          {TABS.map(({ key, tKey }) => {
            const rs = roleStyle[key] ?? roleStyle.collaborator;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === key ? `${rs.tabActive} ${rs.tabText} shadow-sm` : "text-[#6B6B6F] dark:text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white"}`}>
                {t(tKey)}
              </button>
            );
          })}
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> {t("staff.add")}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9EA3]" />
        <input type="text" placeholder={t("staff.search")} value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white outline-none focus:ring-2 focus:ring-[#FFD600]" />
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-[#CACAC4] dark:border-white/[0.06] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-[#9E9EA3]">
          <p className="font-medium">{t("staff.no_found")}</p>
          <button onClick={openAdd} className="mt-3 text-[#6B6B6F] dark:text-[#9E9EA3] text-sm hover:underline">{t("staff.add_one")}</button>
        </div>
      ) : (
        <div className="stagger-children grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const isSelf       = m._id === currentUser?.id;
            const isRootAdmin  = currentUser?.email?.toLowerCase() === "admin@b2a.com";
            const canDelete    = !isSelf && (m.role !== "admin" || isRootAdmin);
            return (
              <StaffCard key={m._id} member={m} isWorker={tab === "worker"} onEdit={openEdit} onDelete={setDeletingMember} canDelete={canDelete} />
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <Modal title={t("staff.modal.add_title")} onClose={() => setShowAddModal(false)}>
          {renderForm(false)}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#0D0D0D] dark:hover:bg-[#9E9EA3]/20 transition-colors">
              {t("staff.modal.cancel")}
            </button>
            <button onClick={handleAdd} disabled={saving} className="flex-1 py-2 rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t("staff.modal.saving") : t("staff.modal.add_btn")}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <Modal title={`${t("staff.modal.edit_title")} — ${editingMember.name}`} onClose={() => setEditingMember(null)}>
          {renderForm(true)}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setEditingMember(null)} className="flex-1 py-2 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#0D0D0D] dark:hover:bg-[#9E9EA3]/20 transition-colors">
              {t("staff.modal.cancel")}
            </button>
            <button onClick={handleEdit} disabled={saving} className="flex-1 py-2 rounded-lg bg-[#0D0D0D] hover:bg-[#9E9EA3]/20 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t("staff.modal.saving") : t("staff.modal.save_btn")}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deletingMember && (
        <Modal title={t("staff.modal.delete_title")} onClose={() => setDeletingMember(null)}>
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
            {t("staff.modal.delete_confirm")} <span className="font-semibold text-[#0D0D0D] dark:text-white">{deletingMember.name}</span>? {t("staff.modal.delete_warn")}
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setDeletingMember(null)} className="flex-1 py-2 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm font-medium text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:bg-[#0D0D0D] dark:hover:bg-[#9E9EA3]/20 transition-colors">
              {t("staff.modal.cancel")}
            </button>
            <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <Trash2 className="w-4 h-4" /> {t("staff.modal.delete_btn")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Staff;
