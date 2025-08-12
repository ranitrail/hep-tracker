import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function HelpModal({ open, onClose }) {
  const firstRef = useRef(null);
  const lastRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus management
    const lastActive = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // very small focus trap
        const active = document.activeElement;
        if (e.shiftKey && active === firstRef.current) {
          e.preventDefault();
          lastRef.current?.focus();
        } else if (!e.shiftKey && active === lastRef.current) {
          e.preventDefault();
          firstRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      lastActive?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const Modal = (
    <div
      className="bb-help-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="bb-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bb-help-title"
      >
        {/* focus sentinels */}
        <button ref={firstRef} style={{ position: "absolute", opacity: 0 }} aria-hidden="true" />
        <div className="bb-help-header">
          <h2 id="bb-help-title">How to use HEP Tracker</h2>
          <button ref={closeRef} className="bb-help-close" onClick={onClose} aria-label="Close help">×</button>
        </div>

        <div className="bb-help-body">
          <section>
            <h3>1) Check off your daily exercises</h3>
            <p>Tap each card to mark complete, then tap <strong>Save</strong> below the list.</p>
            <img src="/help/exercises.png" alt="Daily Exercises screen" />
          </section>

          <section>
            <h3>2) See your weekly progress</h3>
            <p>Open <strong>Progress</strong> to see bars per day. Use <em>Previous</em>/<em>Next Week</em> to switch.</p>
            <img src="/help/progress.png" alt="Weekly Progress chart" />
          </section>

          <section>
            <h3>3) Tips</h3>
            <ul>
              <li>Tap a checked card again to uncheck.</li>
              <li>Buttons stay the same across screens.</li>
              <li>Log out using the top-right button.</li>
            </ul>
          </section>
        </div>

        {/* focus sentinels */}
        <button ref={lastRef} style={{ position: "absolute", opacity: 0 }} aria-hidden="true" />
      </div>

      <style>{`
        .bb-help-overlay{
          position: fixed; inset: 0; background: rgba(0,0,0,.4);
          display: grid; place-items: center; z-index: 99999; padding: 16px;
        }
        .bb-help-modal{
          width: min(920px, 100%);
          max-height: min(85vh, 100%);
          overflow: auto;
          background: #fff; border-radius: 16px; box-shadow: var(--shadow);
          padding: 16px 16px 24px;
        }
        .bb-help-header{
          display:flex; align-items:center; justify-content:space-between;
          gap: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 12px;
        }
        .bb-help-header h2{ margin: 0; font-size: 20px; }
        .bb-help-close{
          border: 1px solid #e5e7eb; background: #fff; border-radius: 10px;
          padding: 6px 10px; font-size: 18px; line-height: 1;
          box-shadow: var(--shadow); cursor: pointer;
        }
        .bb-help-close:hover{ background: rgba(79,70,229,.10); color: var(--primary); }

        .bb-help-body section{ margin: 14px 0 18px; }
        .bb-help-body h3{ margin: 0 0 6px; font-size: 16px; }
        .bb-help-body img{
          width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 12px;
          box-shadow: var(--shadow); margin-top: 8px;
        }
      `}</style>
    </div>
  );

  return createPortal(Modal, document.body);
}
