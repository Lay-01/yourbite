import { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";

export default function TableFormModal({ open, table = null, onClose, onSave }) {
  const [number, setNumber] = useState("");
  const [seats, setSeats] = useState("4");
  const [error, setError] = useState("");
  useEffect(() => { setNumber(table?.number || ""); setSeats(String(table?.seats || 4)); setError(""); }, [table, open]);
  const submit = (event) => {
    event.preventDefault();
    const capacity = Number(seats);
    if (!number.trim()) return setError("Table number is required.");
    if (!Number.isInteger(capacity) || capacity < 1) return setError("Seats must be a positive whole number.");
    try { onSave({ number: number.trim(), seats: capacity }); }
    catch (err) { setError(err.message); }
  };
  return (
    <Modal open={open} onClose={onClose} title={table ? "Edit Table" : "Add Table"} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="table-form" type="submit">{table ? "Save Table" : "Add Table"}</button></>}>
      <form id="table-form" className="form" onSubmit={submit}>
        <label className="field"><span>Table Number</span><input value={number} onChange={(event) => setNumber(event.target.value)} required /></label>
        <label className="field"><span>Seats</span><input type="number" min="1" step="1" value={seats} onChange={(event) => setSeats(event.target.value)} required /></label>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    </Modal>
  );
}