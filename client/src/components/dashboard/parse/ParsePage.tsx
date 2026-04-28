import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import api from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";

type Stage = "idle" | "previewing" | "ready" | "processing" | "done" | "error";

interface PreviewResult {
  sheets: string[];
  count: number;
}

const ParsePage = () => {
  const { t } = useLanguage();
  const [file, setFile]         = useState<File | null>(null);
  const [stage, setStage]       = useState<Stage>("idle");
  const [preview, setPreview]   = useState<PreviewResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [zipUrl, setZipUrl]     = useState<string | null>(null);

  const reset = () => {
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setFile(null);
    setStage("idle");
    setPreview(null);
    setErrorMsg("");
    setZipUrl(null);
  };

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    reset();
    setFile(f);
    setStage("previewing");

    try {
      const form = new FormData();
      form.append("file", f);
      const { data } = await api.post<PreviewResult>("/parse/preview", form);
      setPreview(data);
      setStage("ready");
    } catch {
      setErrorMsg(t("parse.preview_error"));
      setStage("error");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    maxFiles: 1,
    disabled: stage === "processing",
  });

  const handleProcess = async () => {
    if (!file) return;
    setStage("processing");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await api.post("/parse/run", form, { responseType: "blob" });

      const url = URL.createObjectURL(new Blob([response.data], { type: "application/zip" }));
      setZipUrl(url);
      setStage("done");
    } catch {
      setErrorMsg(t("parse.process_error"));
      setStage("error");
    }
  };

  const handleDownload = () => {
    if (!zipUrl) return;
    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = "parsed_timesheets.zip";
    a.click();
  };

  return (
    <div style={{ padding: "32px", maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          {t("parse.title")}
        </h1>
        <p style={{ marginTop: "6px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
          {t("parse.subtitle")}
        </p>
      </div>

      {/* How it works */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px",
        }}
      >
        {[
          { num: "1", label: t("parse.step1") },
          { num: "2", label: t("parse.step2") },
          { num: "3", label: t("parse.step3") },
        ].map(({ num, label }) => (
          <div
            key={num}
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid var(--color-border-default)",
              backgroundColor: "var(--color-bg-card)",
              display: "flex", alignItems: "center", gap: "12px",
            }}
          >
            <span
              style={{
                width: "28px", height: "28px", borderRadius: "50%",
                backgroundColor: "#FFD600", color: "#000",
                fontWeight: 800, fontSize: "13px",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {num}
            </span>
            <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#FFD600" : "var(--color-border-default)"}`,
          borderRadius: "16px",
          padding: "48px 32px",
          textAlign: "center",
          cursor: stage === "processing" ? "not-allowed" : "pointer",
          backgroundColor: isDragActive ? "rgba(255,214,0,0.05)" : "var(--color-bg-card)",
          transition: "all 0.2s",
          position: "relative",
        }}
      >
        <input {...getInputProps()} />

        {file && stage !== "idle" && (
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            style={{
              position: "absolute", top: "12px", right: "12px",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-text-tertiary)", padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          {stage === "previewing" ? (
            <Loader2 size={36} style={{ color: "#FFD600", animation: "spin 1s linear infinite" }} />
          ) : stage === "done" ? (
            <CheckCircle2 size={36} style={{ color: "#22c55e" }} />
          ) : stage === "error" ? (
            <AlertCircle size={36} style={{ color: "#ef4444" }} />
          ) : (
            <FileSpreadsheet size={36} style={{ color: file ? "#FFD600" : "var(--color-text-tertiary)" }} />
          )}

          {file ? (
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                {file.name}
              </p>
              <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", marginTop: "4px" }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                {isDragActive ? t("parse.drop_now") : t("parse.drop_prompt")}
              </p>
              <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", marginTop: "4px" }}>
                {t("parse.drop_hint")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview result */}
      {preview && stage !== "idle" && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid var(--color-border-default)",
            backgroundColor: "var(--color-bg-card)",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 10px" }}>
            {t("parse.sheets_found").replace("{n}", String(preview.count))}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {preview.sheets.map((s) => (
              <span
                key={s}
                style={{
                  padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
                  backgroundColor: "rgba(255,214,0,0.12)", color: "#b45309",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div
          style={{
            padding: "14px 16px", borderRadius: "10px",
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex", alignItems: "center", gap: "10px",
          }}
        >
          <AlertCircle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "#ef4444", margin: 0 }}>{errorMsg}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px" }}>
        {(stage === "ready" || stage === "error") && (
          <button
            onClick={handleProcess}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 20px", borderRadius: "10px",
              backgroundColor: "#FFD600", color: "#000",
              fontWeight: 700, fontSize: "14px",
              border: "none", cursor: "pointer",
            }}
          >
            <Upload size={16} />
            {t("parse.process_btn")}
          </button>
        )}

        {stage === "processing" && (
          <button
            disabled
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 20px", borderRadius: "10px",
              backgroundColor: "#FFD600", color: "#000",
              fontWeight: 700, fontSize: "14px",
              border: "none", cursor: "not-allowed", opacity: 0.7,
            }}
          >
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            {t("parse.processing")}
          </button>
        )}

        {stage === "done" && (
          <>
            <button
              onClick={handleDownload}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 20px", borderRadius: "10px",
                backgroundColor: "#22c55e", color: "#fff",
                fontWeight: 700, fontSize: "14px",
                border: "none", cursor: "pointer",
              }}
            >
              <Download size={16} />
              {t("parse.download_btn").replace("{n}", String(preview?.count ?? 0))}
            </button>
            <button
              onClick={reset}
              style={{
                padding: "10px 20px", borderRadius: "10px",
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-secondary)",
                fontWeight: 600, fontSize: "14px", cursor: "pointer",
              }}
            >
              {t("parse.new_file")}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ParsePage;
