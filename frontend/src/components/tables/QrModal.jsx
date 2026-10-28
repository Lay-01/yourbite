import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Icon from "../common/Icon.jsx";
import Modal from "../common/Modal.jsx";
import { useToast } from "../common/Toast.jsx";
import { getTenantId } from "../../services/tenant.js";

export default function QrModal({ open, table, onClose }) {
  const canvasRef = useRef(null);
  const toast = useToast();
  const [error, setError] = useState("");
  const tenantId = getTenantId();
  const url = table && tenantId
    ? `${window.location.origin}/menu/table/${table.number}?tenant=${encodeURIComponent(tenantId)}`
    : "";
  useEffect(() => {
    if (!open || !table || !canvasRef.current) return;
    if (!tenantId) {
      canvasRef.current.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setError("Your cafe tenant is still being verified. Please try again.");
      return;
    }
    canvasRef.current.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setError("Generating QR code…");
    QRCode.toCanvas(canvasRef.current, url, { width: 230, margin: 1 })
      .then(() => setError(""))
      .catch(() => setError("Could not generate this QR code."));
  }, [open, table, tenantId, url]);
  const download = () => {
    if (!tenantId || !canvasRef.current) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `table-${table.number}-qr.png`;
    link.click();
  };
  const copy = async () => {
    if (!tenantId) return;
    try { await navigator.clipboard.writeText(url); toast("Menu link copied."); }
    catch { toast("Could not copy the link.", "error"); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Table ${table?.number || ""} QR`} footer={<><button className="btn btn-ghost" onClick={copy} disabled={!tenantId}><Icon name="copy" size={15} /> Copy link</button><button className="btn btn-primary" onClick={download} disabled={!tenantId}><Icon name="download" size={15} /> Download QR</button></>}>
      <div className="qr-modal-body">
        <div className="qr-frame"><canvas ref={canvasRef} /></div>
        <p>Scan to open the shared menu. The order will be associated with Table {table?.number}.</p>
        {url ? <code className="qr-meta">{url}</code> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}