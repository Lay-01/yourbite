export function getTenantId(user) {
  let currentUser = user;
  if (!currentUser && typeof localStorage !== "undefined") {
    try {
      currentUser = JSON.parse(localStorage.getItem("yourbite_auth_user") || "null");
    } catch {
      return null;
    }
  }

  if (!currentUser?.id) return null;
  const tenantId = currentUser.tenantId || `tenant_${currentUser.id}`;
  if (!currentUser.tenantId && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(
        "yourbite_auth_user",
        JSON.stringify({ ...currentUser, tenantId })
      );
    } catch {
      /* the caller can still use the derived tenant for this session */
    }
  }
  return tenantId;
}
