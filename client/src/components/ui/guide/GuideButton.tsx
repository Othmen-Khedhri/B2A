import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import GuideChat from "./GuideChat";

export default function GuideButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <GuideChat onClose={() => setOpen(false)} />}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le guide" : "Ouvrir le guide"}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          backgroundColor: open ? "var(--color-text-primary)" : "var(--color-accent)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          zIndex: 9999,
          transition: "background-color 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <MessageCircleQuestion
          style={{
            width: "22px",
            height: "22px",
            color: open ? "var(--color-accent)" : "#0D0D0D",
            transition: "color 0.2s",
          }}
        />
      </button>
    </>
  );
}
