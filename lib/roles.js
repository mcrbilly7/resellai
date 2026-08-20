// Clicking a role button applies one of these presets to a worker's
// permissions. Toggling an individual checkbox afterward is still allowed -
// the UI just relabels the role as CUSTOM once the flags no longer match a
// preset exactly.
export const ROLE_PRESETS = {
  VIEWER: {
    label: "Viewer",
    description: "Can see inventory, nothing else.",
    canViewInventory: true, canEditInventory: false, canBuy: false, canSell: false, canViewEarnings: false,
  },
  BUYER: {
    label: "Buyer",
    description: "Can see inventory and log new purchases (adds stock).",
    canViewInventory: true, canEditInventory: false, canBuy: true, canSell: false, canViewEarnings: false,
  },
  SELLER: {
    label: "Seller",
    description: "Can see inventory and record sales (removes stock).",
    canViewInventory: true, canEditInventory: false, canBuy: false, canSell: true, canViewEarnings: false,
  },
  INVENTORY: {
    label: "Inventory manager",
    description: "Full inventory control - add, edit, buy, and sell.",
    canViewInventory: true, canEditInventory: true, canBuy: true, canSell: true, canViewEarnings: false,
  },
  CUSTOM: {
    label: "Custom",
    description: "Whatever you set below.",
    canViewInventory: true, canEditInventory: false, canBuy: false, canSell: false, canViewEarnings: false,
  },
};

export const ROLE_KEYS = ["VIEWER", "BUYER", "SELLER", "INVENTORY", "CUSTOM"];

// Given a set of permission flags, finds the role key whose preset matches
// exactly, or "CUSTOM" if none do - used to keep the UI's role label honest.
export function roleForPermissions(perms) {
  for (const key of ["VIEWER", "BUYER", "SELLER", "INVENTORY"]) {
    const p = ROLE_PRESETS[key];
    if (
      p.canViewInventory === perms.canViewInventory &&
      p.canEditInventory === perms.canEditInventory &&
      p.canBuy === perms.canBuy &&
      p.canSell === perms.canSell
    ) {
      return key;
    }
  }
  return "CUSTOM";
}
