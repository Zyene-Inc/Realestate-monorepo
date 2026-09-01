-- Preserve the transfer-reversal reference when a destination-charge dispute
-- is recovered from the owner connected account. This keeps the rental ledger
-- reconciled without exposing Stripe data to the client.
ALTER TABLE "Payment"
  ADD COLUMN "stripeTransferReversalId" TEXT;

CREATE UNIQUE INDEX "Payment_stripeTransferReversalId_key"
  ON "Payment"("stripeTransferReversalId")
  WHERE "stripeTransferReversalId" IS NOT NULL;
