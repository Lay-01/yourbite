import { useMemo, useState } from "react";
import { useStore } from "../../services/store.js";
import { addTable, deleteTable, freeTable, updateTable } from "../../services/api.js";
import Icon from "../../components/common/Icon.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Modal from "../../components/common/Modal.jsx";
import TableCard from "../../components/tables/TableCard.jsx";
import TableFormModal from "../../components/tables/TableFormModal.jsx";
import QrModal from "../../components/tables/QrModal.jsx";
import { useToast } from "../../components/common/Toast.jsx";

export default function TablesPage() {
  const state = useStore();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const tables = useMemo(() => state.tables.filter((table) => table.number.toLowerCase().includes(search.trim().toLowerCase())), [state.tables, search]);
  const summary = {
    available: state.tables.filter((table) => table.status === "available").length,
    occupied: state.tables.filter((table) => table.status === "occupied").length,
    pending: state.tables.filter((table) => table.status === "payment_pending").length,
  };

  const save = (data) => {
    if (editing) updateTable(editing.id, data);
    else addTable(data);
    setEditing(null);
    setFormOpen(false);
    toast(editing ? "Table updated." : "Table created.");
  };

  const confirmDelete = () => {
    try { deleteTable(deleting.id); toast("Table deleted."); setDeleting(null); setError(""); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <div className="page-actions">
        <div className="status-summary">
          <span className="sum available"><i />{summary.available} Available</span>
          <span className="sum occupied"><i />{summary.occupied} Occupied</span>
          <span className="sum pending"><i />{summary.pending} Payment pending</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Icon name="plus" size={16} /> Add Table</button>
      </div>
      <div className="toolbar">
        <div className="search-box"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search table number…" /></div>
      </div>
      {tables.length === 0 ? (
        <section className="panel"><EmptyState icon="table" title={search ? "No tables found" : "No tables configured"} subtitle={search ? "Try another table number." : "Add a table to generate its customer QR code."} action={!search ? <button className="btn btn-primary" onClick={() => setFormOpen(true)}><Icon name="plus" size={15} /> Add Table</button> : null} /></section>
      ) : (
        <div className="table-grid">
          {tables.map((table) => {
            const openOrders = state.orders.filter((order) => order.tableId === table.id && order.status !== "cancelled" && order.paymentStatus !== "paid");
            return <TableCard key={table.id} table={table} openOrders={openOrders} onEdit={(value) => { setEditing(value); setFormOpen(true); }} onDelete={setDeleting} onQr={setQrTable} onFree={(value) => { freeTable(value.id); toast(`Table ${value.number} is available.`); }} />;
          })}
        </div>
      )}
      <TableFormModal open={formOpen} table={editing} onClose={() => setFormOpen(false)} onSave={save} />
      <QrModal open={Boolean(qrTable)} table={qrTable} onClose={() => setQrTable(null)} />
      <Modal open={Boolean(deleting)} onClose={() => { setDeleting(null); setError(""); }} title="Delete table?" footer={<><button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button><button className="btn btn-danger" onClick={confirmDelete}>Delete</button></>}>
        <p>Delete Table {deleting?.number}? Existing order records will be retained.</p>{error ? <p className="form-error">{error}</p> : null}
      </Modal>
    </>
  );
}