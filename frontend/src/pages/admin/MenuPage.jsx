import { useMemo, useState } from "react";
import { useStore } from "../../services/store.js";
import { deleteItem, listItems, saveItem, toggleItemAvailability } from "../../services/api.js";
import Icon from "../../components/common/Icon.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Modal from "../../components/common/Modal.jsx";
import CategoryManager from "../../components/menu/CategoryManager.jsx";
import ItemFormModal from "../../components/menu/ItemFormModal.jsx";
import MenuItemRow from "../../components/menu/MenuItemRow.jsx";
import { useToast } from "../../components/common/Toast.jsx";

export default function MenuPage() {
  const state = useStore();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const categories = useMemo(() => [...state.categories].sort((a, b) => a.order - b.order), [state.categories]);
  const items = listItems({ search, categoryId });
  const itemCounts = Object.fromEntries(categories.map((category) => [category.id, state.items.filter((item) => item.categoryId === category.id).length]));

  const save = (item) => {
    saveItem({ ...item, ...(editing ? { id: editing.id } : {}) });
    setFormOpen(false); setEditing(null); toast(editing ? "Menu item updated." : "Menu item added.");
  };
  const remove = () => {
    try { deleteItem(deleting.id); setDeleting(null); setError(""); toast("Menu item deleted."); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <div className="page-actions">
        <div className="muted">{state.items.length} menu item{state.items.length === 1 ? "" : "s"} · {categories.length} categor{categories.length === 1 ? "y" : "ies"}</div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Icon name="plus" size={16} /> Add Menu Item</button>
      </div>
      <div className="menu-admin-grid">
        <section className="panel menu-admin-items">
          <div className="panel-head"><h3>Menu Items</h3></div>
          <div className="toolbar">
            <div className="search-box"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu items…" /></div>
            <select className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          </div>
          {items.length === 0 ? <EmptyState icon="menu" title={search || state.items.length ? "No menu items found" : "Your menu is empty"} subtitle={search || state.items.length ? "Try changing the search or category filter." : "Add your first menu item to start accepting orders."} action={!state.items.length ? <button className="btn btn-primary" onClick={() => setFormOpen(true)}><Icon name="plus" size={15} /> Add Menu Item</button> : null} /> : (
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Category</th><th className="num">Price</th><th>Availability</th><th>Actions</th></tr></thead><tbody>
              {items.map((item) => <MenuItemRow key={item.id} item={item} categoryName={categories.find((category) => category.id === item.categoryId)?.name || "—"} onEdit={(value) => { setEditing(value); setFormOpen(true); }} onDelete={setDeleting} onToggle={(value) => { toggleItemAvailability(value.id); toast(value.available ? "Item marked unavailable." : "Item marked available."); }} />)}
            </tbody></table></div>
          )}
        </section>
        <CategoryManager categories={categories} itemCounts={itemCounts} />
      </div>
      <ItemFormModal open={formOpen} item={editing} categories={categories} onClose={() => setFormOpen(false)} onSave={save} />
      <Modal open={Boolean(deleting)} onClose={() => { setDeleting(null); setError(""); }} title="Delete menu item?" footer={<><button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button><button className="btn btn-danger" onClick={remove}>Delete item</button></>}>
        <p>Delete {deleting?.name} from the current menu? Existing order lines retain their item snapshot.</p>{error ? <p className="form-error">{error}</p> : null}
      </Modal>
    </>
  );
}