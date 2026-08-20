import { prisma } from "./db";

// Resolves what the requesting user is allowed to do with ownerId's account
// data. The owner themself always gets full access; a worker's access comes
// from their active Membership row.
export async function getAccessContext(requestingUserId, ownerId) {
  if (!requestingUserId || !ownerId) return null;

  if (requestingUserId === ownerId) {
    return {
      isOwner: true,
      canViewInventory: true, canEditInventory: true, canBuy: true, canSell: true, canViewEarnings: true,
    };
  }

  const membership = await prisma.membership.findFirst({
    where: { ownerId, workerId: requestingUserId, status: "ACTIVE" },
  });
  if (!membership) return null;

  return {
    isOwner: false,
    membershipId: membership.id,
    canViewInventory: membership.canViewInventory,
    canEditInventory: membership.canEditInventory,
    canBuy: membership.canBuy,
    canSell: membership.canSell,
    canViewEarnings: membership.canViewEarnings,
  };
}

// Strips financial fields from an item when the requester can't see earnings.
export function scrubItem(item, access) {
  if (access.canViewEarnings) return item;
  const { purchasePrice, salePrice, ...rest } = item;
  return rest;
}
