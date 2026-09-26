import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../../services/store.js";
import { useCart } from "../../components/customer/CartProvider.jsx";
import Icon from "../../components/common/Icon.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { inr } from "../../utils/format.js";

const menuPhotography = {
  "i-fries": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=720&q=85",
  "i-wings": "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=720&q=85",
  "i-paneer-butter": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=720&q=85",
  "i-veg-biryani": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=720&q=85",
  "i-butter-chicken": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=720&q=85",
  "i-paneer-pizza": "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=720&q=85",
  "i-margherita": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=720&q=85",
  "i-veg-burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=720&q=85",
};

const categoryIcons = {
  popular: "star",
  "cat-starters": "utensils",
  "cat-main": "cloche",
  "cat-pizza": "pizza",
  "cat-burgers": "burger",
  "cat-beverages": "coffee",
  "cat-desserts": "cake",
};

function VegMark({ veg }) {
  return (
    <span className={`veg-mark${veg ? "" : " nonveg"}`}>
      <i />
    </span>
  );
}

function ItemCard({ item, inCartQty, onAdd, onInc, onDec }) {
  return (
    <article className="qr-card">
      <div className="qr-card-info">
        <div className="qr-card-top">
          <VegMark veg={item.veg} />
          {item.bestseller ? <span className="qr-best">★ Bestseller</span> : null}
        </div>
        <h4>{item.name}</h4>
        {item.description ? <p className="qr-desc">{item.description}</p> : null}
        <div className="qr-card-foot">
          <span className="qr-price">{inr(item.price)}</span>
          {inCartQty > 0 ? (
            <div className="qr-stepper">
              <button onClick={onDec} aria-label="Decrease"><Icon name="minus" size={14} /></button>
              <b>{inCartQty}</b>
              <button onClick={onInc} aria-label="Increase"><Icon name="plus" size={14} /></button>
            </div>
          ) : (
            <button className="qr-add" onClick={onAdd}>
              Add <Icon name="plus" size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="qr-card-thumb">
        {item.image || menuPhotography[item.id] ? (
          <img src={item.image || menuPhotography[item.id]} alt={item.name} loading="lazy" />
        ) : <span>{item.emoji}</span>}
      </div>
    </article>
  );
}

export default function CustomerMenuPage() {
  const { tableId } = useParams();
  const state = useStore();
  const cart = useCart();

  const [search, setSearch] = useState("");
  const [vegFilter, setVegFilter] = useState(null); // null = all, true = veg, false = non-veg
  const [category, setCategory] = useState("popular");

  const categories = useMemo(
    () => [...state.categories].sort((a, b) => a.order - b.order),
    [state.categories]
  );
  const available = useMemo(
    () =>
      state.items.filter(
        (i) => i.available && (vegFilter === null || i.veg === vegFilter)
      ),
    [state.items, vegFilter]
  );

  const categoryItems = useMemo(() => {
    if (category === "popular") return available.filter((item) => item.bestseller);
    return available.filter((item) => item.categoryId === category);
  }, [available, category]);

  if (!cart?.table) {
    return (
      <div className="cust-shell">
        <EmptyState
          icon="qr"
          title={`Table “${tableId}” not found`}
          subtitle="This QR code may be out of date. Ask staff for the correct table code."
        />
      </div>
    );
  }

  const table = cart.table;
  const cafeName = state.settings.cafeName || "Your Restaurant";
  const q = search.trim().toLowerCase();
  const filtered = q
    ? available.filter((i) => `${i.name} ${i.description}`.toLowerCase().includes(q))
    : categoryItems;

  const catList = categories.filter((c) => available.some((i) => i.categoryId === c.id));
  const sectionTitle = q ? "Search results" : category === "popular" ? "Popular" : categories.find((c) => c.id === category)?.name || "Menu";
  const itemCount = q ? filtered.length : categoryItems.length;

  return (
    <div className="qr-page">
      <header className="qr-header">
        <div className="qr-brand">
          <div className="qr-brand-text">
            <strong>Your Bite</strong>
            <small>Good Food <i /> Better Mood</small>
          </div>
        </div>
        <div className="qr-header-actions">
          <div className="qr-search">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes…"
            />
            {search ? (
              <button onClick={() => setSearch("")} aria-label="Clear">
                <Icon name="x" size={13} />
              </button>
            ) : null}
          </div>
          <div className="qr-diet">
            <button
              className={vegFilter === true ? "on veg" : ""}
              onClick={() => setVegFilter(vegFilter === true ? null : true)}
            >
              <span className="veg-dot" /> Veg
            </button>
            <button
              className={vegFilter === false ? "on nonveg" : ""}
              onClick={() => setVegFilter(vegFilter === false ? null : false)}
            >
              <span className="veg-dot nonveg" /> Non-Veg
            </button>
          </div>
        </div>
        <div className="qr-visit-info">
          <span className="qr-hours"><Icon name="clock" size={15} /> {state.settings.openingHours}</span>
        </div>
      </header>

      <div className="qr-body">
        <aside className="qr-sidebar">
          <ul>
            <li>
              <button className={category === "popular" ? "active" : ""} onClick={() => setCategory("popular")}>
                <span className="qr-category-label"><Icon name={categoryIcons.popular} size={17} />Popular</span>
                <small>{available.filter((item) => item.bestseller).length}</small>
              </button>
            </li>
            {catList.map((c) => (
              <li key={c.id}>
                <button className={category === c.id ? "active" : ""} onClick={() => setCategory(c.id)}>
                  <span className="qr-category-label"><Icon name={categoryIcons[c.id] || "menu"} size={17} />{c.name}</span>
                  <small>{available.filter((i) => i.categoryId === c.id).length}</small>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="qr-content">
          <section className="qr-sec">
            <h2 className="qr-sec-title">{sectionTitle}<span>{itemCount} items</span></h2>
            {filtered.length === 0 ? (
              <EmptyState icon={q ? "search" : "menu"} title={q ? `No results for “${search}”` : "No dishes in this category"} subtitle={q ? "Try another dish name." : "Check another category for something delicious."} />
            ) : (
              <div className="qr-grid">
                {filtered.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    inCartQty={cart.qtyOf(item.id)}
                    onAdd={() => cart.add(item)}
                    onInc={() => cart.setQty(item.id, cart.qtyOf(item.id) + 1)}
                    onDec={() => cart.setQty(item.id, cart.qtyOf(item.id) - 1)}
                  />
                ))}
              </div>
            )}
          </section>
          <footer className="qr-footer">A menu by {cafeName} · Powered by Your Bite</footer>
        </main>
      </div>

      <div className="qr-cart-bar">
        <div className="qr-cart-summary">
          <span className="qr-cart-icon"><Icon name="cart" size={19} /></span>
          <span className="qr-cart-copy"><strong>Your order</strong><small>{cart.count} {cart.count === 1 ? "item" : "items"}</small></span>
          {cart.count > 0 ? <strong className="qr-cart-total">{inr(cart.subtotal)}</strong> : null}
        </div>
        <Link to={`/menu/table/${table.number}/cart`} className="qr-cart-view">View cart <Icon name="arrowRight" size={16} /></Link>
      </div>
    </div>
  );
}
