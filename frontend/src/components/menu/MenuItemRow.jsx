import Icon from "../common/Icon.jsx";
import Badge from "../common/Badge.jsx";
import { inr } from "../../utils/format.js";

export default function MenuItemRow({ item, categoryName, onEdit, onDelete, onToggle }) {
  return (
    <tr className={!item.available ? "row-dim" : ""}>
      <td>
        <div className="item-cell">
          <span className={`item-emoji${item.veg ? "" : " nonveg"}`}>{item.image ? <img src={item.image} alt="" /> : item.emoji || "🍽️"}</span>
          <span><strong>{item.name}{item.bestseller ? <Badge tone="warn">Bestseller</Badge> : null}</strong><small>{item.description}</small></span>
        </div>
      </td>
      <td>{categoryName}</td>
      <td className="num">{inr(item.price)}</td>
      <td><button className={`chip-toggle ${item.available ? "on" : "off"}`} onClick={() => onToggle(item)}>{item.available ? "Available" : "Unavailable"}</button></td>
      <td className="row-actions"><button className="icon-btn" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Icon name="edit" size={15} /></button><button className="icon-btn danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`}><Icon name="trash" size={15} /></button></td>
    </tr>
  );
}