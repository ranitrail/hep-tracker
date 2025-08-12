import React, { useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

export default function HelpModal({ open, onClose }) {
  const firstRef = useRef(null);
  const lastRef = useRef(null);
  const closeRef = useRef(null);

  // Build a /logout link that matches the current deployment
  const logoutHref = useMemo(() => {
    try {
      return `${window.location.origin}/logout`;
    } catch {
      return "https://your-app-domain/logout";
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const lastActive = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
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
          <h2 id="bb-help-title">HEP Tracker — Client Quick Guide</h2>
          <button ref={closeRef} className="bb-help-close" onClick={onClose} aria-label="Close help">×</button>
        </div>

        <div className="bb-help-body">
          <section>
            <h3>1) What you’ll see</h3>
            <ul>
              <li><strong>Logo + Log Out</strong> at the top.</li>
              <li>Two tabs at the bottom: <strong>Exercises</strong> and <strong>Progress</strong>.</li>
            </ul>
          </section>

          <section>
            <h3>2) Daily Exercises (default tab)</h3>
            <h4>Check off today’s exercises</h4>
            <ol>
              <li>Tap <strong>Exercises</strong> (bottom left) if you’re not already there.</li>
              <li>You’ll see <strong>Today’s Progress</strong> and a list of cards:</li>
            </ol>
            <ul className="bb-sublist">
              <li>Each card shows the <em>exercise name</em> and <em>sets × reps</em>.</li>
              <li>Tap a card to <strong>mark complete</strong> (✓ appears). Tap again to uncheck.</li>
            </ul>

            <p><em>Optional:</em></p>
            <ul className="bb-sublist">
              <li><strong>Mark all complete</strong> – checks all exercises for today.</li>
              <li><strong>Clear all</strong> – unchecks everything.</li>
            </ul>

            <h4>Save your day</h4>
            <p>Scroll down and tap <strong>Save</strong> (under the exercise list). A small green message appears at the top: <em>“Progress saved successfully!”</em></p>
            <p className="bb-tip">Tip: If your phone vibrates briefly when checking a card, that’s just a subtle confirmation.</p>

            <img src="/help/exercises.png" alt="Daily Exercises screen" />
          </section>

          <section>
            <h3>3) Weekly Progress</h3>
            <ol>
              <li>Tap <strong>Progress</strong> (bottom right).</li>
              <li>You’ll see <strong>Weekly Progress</strong> for the current week:</li>
            </ol>
            <ul className="bb-sublist">
              <li><span className="bb-purple">Purple bars</span> = how many exercises you completed each day.</li>
              <li>The <span className="bb-dotted">dotted line</span> shows your <strong>daily goal</strong> (how many exercises were assigned).</li>
            </ul>
            <ul className="bb-sublist">
              <li>Use <em>Previous Week</em> / <em>Next Week</em> to switch weeks.</li>
              <li>Tap a bar to see the exact date and total completed for that day.</li>
            </ul>

            <img src="/help/progress.png" alt="Weekly Progress chart" />
          </section>

          <section>
            <h3>4) Logging Out</h3>
            <p>Tap <strong>Log Out</strong> at the top right at any time.</p>
            <p>If you don’t see it, you can also visit: <a href={logoutHref}>{logoutHref}</a> (this signs you out and takes you to the login screen).</p>
          </section>

          <section>
            <h3>5) Helpful tips</h3>
            <ul>
              <li>No <em>“Save”</em> button? Scroll to the end of the exercise list—it's right below the last card.</li>
              <li>Nothing appears? Give it a second—loading placeholders show first on slow connections.</li>
              <li>Checked the wrong item? Tap the card again to uncheck and tap <strong>Save</strong>.</li>
              <li>Full-width chart on mobile: if you can’t see the right side, scroll the page a bit—the chart fits your screen automatically.</li>
              <li>Screenshots blocked in private/incognito mode? Try a normal tab.</li>
            </ul>
          </section>

          <section>
            <h3>6) Privacy</h3>
            <p>Your exercise data is only visible to you and your physiotherapist. Logging out clears your secure session on this device.</p>
          </section>

          <section>
            <h3>7) Need help?</h3>
            <p>If something doesn’t save, ensure you’re online and try again. Still stuck? Reply to your therapist’s email with a short description (phone model + what happened).</p>
          </section>

          <p><strong>That’s it —</strong> check off your exercises each day and hit <strong>Save</strong>. The <strong>Progress</strong> tab will show your week at a glance.</p>
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
        .bb-help-body h4{ margin: 8px 0 4px; font-size: 15px; }
        .bb-help-body p{ margin: 6px 0; }
        .bb-help-body img{
          width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 12px;
          box-shadow: var(--shadow); margin-top: 8px;
        }
        .bb-sublist{ margin: 4px 0 8px 20px; }
        .bb-tip{ background: #f6f7ff; border: 1px solid #e3e6ff; padding: 8px 10px; border-radius: 8px; }

        .bb-purple{ color: var(--primary); font-weight: 600; }
        .bb-dotted{ border-bottom: 2px dotted var(--success); display: inline-block; line-height: 0.9; }
      `}</style>
    </div>
  );

  return createPortal(Modal, document.body);
}
