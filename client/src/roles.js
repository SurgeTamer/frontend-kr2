export const ROLES = {
  USER: "user",
  SELLER: "seller",
  ADMIN: "admin",
};

export const roleLabels = {
  user: "покупатель",
  seller: "продавец",
  admin: "админ",
};

export function roleLabel(role) {
  return roleLabels[role] || role;
}
