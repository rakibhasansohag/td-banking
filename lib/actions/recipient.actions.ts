"use server";

import { getLoggedInUser } from "@/lib/actions/auth.actions";
import { getDatabase } from "@/lib/database";

export type TransferRecipient = { email: string; code: string; mask: string };

export async function searchTransferRecipients(query: string): Promise<TransferRecipient[]> {
  if (typeof query !== "string" || query.length > 254) return [];
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const user = await getLoggedInUser();
  if (!user) return [];

  const result = await getDatabase().query<TransferRecipient>(`
    SELECT recipient.email, destination.share_code AS code, destination.mask
    FROM banking_transfer_requests request
    JOIN banking_transfers transfer ON transfer.id = request.transfer_id
    JOIN banking_accounts destination ON destination.id = transfer.destination_account_id
    JOIN "user" recipient ON recipient.id = destination.owner_user_id
    WHERE request.owner_user_id = $1
      AND (strpos(lower(recipient.email), $2) > 0 OR strpos(lower(destination.share_code), $2) > 0)
    GROUP BY recipient.email, destination.share_code, destination.mask
    ORDER BY max(transfer.created_at) DESC, destination.share_code
    LIMIT 6`, [user.$id, term]);
  return result.rows;
}
