import { useEffect, useState } from "react";
import Icon from "../common/Icon.jsx";
import Modal from "../common/Modal.jsx";

const blank = { name: "", description: "", categoryId: "", price: "", emoji: "", image: "", veg: true, available: true, bestseller: false };

export default function ItemFormModal({ open, item = null, categories = [], onClose, onSave }) {
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  useEffect(() => { setForm(item ? { ...blank, ...item, price: String(item.price) } : { ...blank, categoryId: categories[0]?.id || "" }); setError(""); }, [item, categories, open]);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim()) return setError("Item name is required.");
    if (!Number.isFinite(price) || price < 0) return setError("Enter a valid price.");
    if (!form.categoryId) return setError("Choose a category.");
    try { onSave({ ...form, price }); setError(""); }
    catch (err) { setError(err.message); }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit Menu Item" : "Add Menu Item"} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="item-form" type="submit"><Icon name="check" size={15} /> Save Item</button></>}>
      <form id="item-form" className="form" onSubmit={submit}>
        <div className="form-grid-2">
          <label className="field"><span>Item Name</span><input value={form.name} onChange={(event) => change("name", event.target.value)} required /></label>
          <label className="field"><span>Price (₹)</span><input type="number" min="0" step="1" value={form.price} onChange={(event) => change("price", event.target.value)} required /></label>
        </div>
        <label className="field"><span>Category</span><select value={form.categoryId} onChange={(event) => change("categoryId", event.target.value)} required><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="field"><span>Description</span><textarea rows="3" value={form.description} onChange={(event) => change("description", event.target.value)} /></label>
        <div className="form-grid-2">
          <label className="field"><span>Emoji fallback</span><input value={form.emoji} onChange={(event) => change("emoji", event.target.value)} /></label>
          <label className="field"><span>Image URL</span><input type="url" value={form.image} onChange={(event) => change("image", event.target.value)} /></label>
        </div>
        <div className="form-grid-2">
          <label className="field"><span>Diet</span><select value={form.veg ? "veg" : "nonveg"} onChange={(event) => change("veg", event.target.value === "veg")}><option value="veg">Vegetarian</option><option value="nonveg">Non-vegetarian</option></select></label>
          <div className="check-stack"><label><input type="checkbox" checked={form.available} onChange={(event) => change("available", event.target.checked)} /> Available</label><label><input type="checkbox" checked={form.bestseller} onChange={(event) => change("bestseller", event.target.checked)} /> Bestseller</label></div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    </Modal>
  );
}