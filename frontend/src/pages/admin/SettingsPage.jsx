import { useEffect, useState } from "react";
import { useStore } from "../../services/store.js";
import { getSettings, saveSettings, resetAllData } from "../../services/api.js";
import { changeCredentials, getStoredUser } from "../../services/auth.js";
import Icon from "../../components/common/Icon.jsx";
import Modal from "../../components/common/Modal.jsx";
import { useToast } from "../../components/common/Toast.jsx";

export default function SettingsPage() {
  const state = useStore();
  const toast = useToast();
  const [form, setForm] = useState(getSettings());
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [reloading, setReloading] = useState(false);

  // Security form state
  const currentUser = getStoredUser();
  const [currentPass, setCurrentPass] = useState("");
  const [newEmail, setNewEmail] = useState(currentUser?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [securityErr, setSecurityErr] = useState("");
  const [savingAuth, setSavingAuth] = useState(false);

  useEffect(() => setForm(getSettings()), [state.settings]);

  const submit = (e) => {
    e.preventDefault();
    try {
      saveSettings({
        cafeName: form.cafeName,
        taxRate: Number(form.taxRate),
        openingHours: form.openingHours,
      });
      setError("");
      toast("Settings saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setSecurityErr("");

    if (!currentPass) {
      setSecurityErr("Enter your current password to save security changes.");
      return;
    }

    setSavingAuth(true);
    try {
      await changeCredentials({
        currentPassword: currentPass,
        newEmail,
        newPassword: newPassword || undefined,
      });
      toast("Owner login credentials updated successfully!");
      setCurrentPass("");
      setNewPassword("");
    } catch (err) {
      setSecurityErr(err.message || "Failed to update security credentials.");
    } finally {
      setSavingAuth(false);
    }
  };

  return (
    <div className="settings-grid">
      <section className="panel">
        <div className="panel-head"><h3>Cafe Profile</h3></div>
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>Cafe Name</span>
            <input
              value={form.cafeName}
              onChange={(e) => setForm((f) => ({ ...f, cafeName: e.target.value }))}
              placeholder="Your Restaurant"
            />
          </label>
          <label className="field">
            <span>Opening Hours</span>
            <input
              value={form.openingHours}
              onChange={(e) => setForm((f) => ({ ...f, openingHours: e.target.value }))}
              placeholder="9:00 AM – 11:00 PM"
            />
          </label>
          <label className="field">
            <span>Tax Rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.taxRate}
              onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
            />
            <small className="hint">Applied to every table bill in the Billing page.</small>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              <Icon name="check" size={15} /> Save Settings
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Owner Security & Credentials</h3></div>
        <form className="form" onSubmit={handleSecuritySubmit}>
          <label className="field">
            <span>Owner Email / Username</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="owner@yourbite.com"
              required
            />
          </label>
          <label className="field">
            <span>New Password (optional)</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </label>
          <label className="field">
            <span>Current Password (required to save)</span>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {securityErr ? <p className="form-error">{securityErr}</p> : null}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={savingAuth}>
              <Icon name="check" size={15} /> {savingAuth ? "Updating..." : "Update Security Info"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Architecture</h3></div>
        <div className="arch-flow">
          <div className="arch-step"><strong>UI</strong><span>React pages & components</span></div>
          <Icon name="chevronDown" size={16} />
          <div className="arch-step"><strong>Service layer</strong><span>src/services/api.js</span></div>
          <Icon name="chevronDown" size={16} />
          <div className="arch-step"><strong>Neon PostgreSQL</strong><span>Persistent restaurant records</span></div>
        </div>
        <p className="hint">
          <strong>Connected through the Node API.</strong> Menu, tables, orders and payments load from the database.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Database Data</h3></div>
        <p className="hint">Reload the latest persisted state from Neon. This does not delete restaurant data.</p>
        <button className="btn btn-soft" onClick={() => setConfirmReset(true)}>
          <Icon name="reset" size={15} /> Reload database data
        </button>
      </section>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reload database data?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={reloading}
              onClick={async () => {
                setReloading(true);
                try {
                  const connected = await resetAllData();
                  setConfirmReset(false);
                  toast(connected ? "Database data reloaded." : "Could not reach the database.", connected ? "success" : "error");
                } finally {
                  setReloading(false);
                }
              }}
            >
              {reloading ? "Loading…" : "Reload data"}
            </button>
          </>
        }
      >
        <p>Current database records will be loaded into this session without changing stored data.</p>
      </Modal>
    </div>
  );
}
