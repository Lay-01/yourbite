import { useState } from "react";
import Icon from "../common/Icon.jsx";
import { addCategory, deleteCategory, moveCategory, updateCategory } from "../../services/api.js";
import { useToast } from "../common/Toast.jsx";

export default function CategoryManager({ categories, itemCounts = {} }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const create = (event) => {
    event.preventDefault();
    try { addCategory({ name }); setName(""); setError(""); toast("Category added."); }
    catch (err) { setError(err.message); }
  };

  const saveName = (category) => {
    try { updateCategory(category.id, { name: editing.name }); setEditing(null); setError(""); toast("Category updated."); }
    catch (err) { setError(err.message); }
  };

  return (
    <section className="panel category-manager">
      <div className="panel-head"><h3>Categories</h3></div>
      <form className="inline-form" onSubmit={create}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New category" aria-label="New category" />
        <button className="btn btn-primary" type="submit"><Icon name="plus" size={15} /> Add</button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      <ul className="category-list">
        {categories.map((category, index) => (
          <li key={category.id}>
            {editing?.id === category.id ? (
              <input autoFocus className="cat-edit-input" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            ) : <div className="cat-info"><strong>{category.name}</strong><small>{itemCounts[category.id] || 0} items</small></div>}
            {editing?.id === category.id ? (
              <div className="cat-actions"><button className="icon-btn" onClick={() => saveName(category)} aria-label="Save"><Icon name="check" size={15} /></button><button className="icon-btn" onClick={() => setEditing(null)} aria-label="Cancel"><Icon name="x" size={15} /></button></div>
            ) : (
              <div className="cat-actions">
                <button className="icon-btn" disabled={index === 0} onClick={() => moveCategory(category.id, "up")} aria-label="Move up"><Icon name="chevronUp" size={15} /></button>
                <button className="icon-btn" disabled={index === categories.length - 1} onClick={() => moveCategory(category.id, "down")} aria-label="Move down"><Icon name="chevronDown" size={15} /></button>
                <button className="icon-btn" onClick={() => setEditing({ id: category.id, name: category.name })} aria-label="Edit"><Icon name="edit" size={15} /></button>
                <button className="icon-btn danger" onClick={() => { try { deleteCategory(category.id); toast("Category deleted."); } catch (err) { toast(err.message, "error"); } }} aria-label="Delete"><Icon name="trash" size={15} /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}