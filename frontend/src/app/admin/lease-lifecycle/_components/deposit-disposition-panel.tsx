"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, FileUp, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  money,
  shortDate,
  statusLabel,
  type DepositDisposition,
} from "@/lib/lease-lifecycle";
import { supabase } from "@/lib/supabase";

export function DepositDispositionPanel({
  disposition,
  onUpdated,
}: {
  disposition: DepositDisposition;
  onUpdated: () => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("CLEANING");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [returnMethod, setReturnMethod] = useState("CHECK");
  const [returnReference, setReturnReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [renderedAt] = useState(() => new Date().getTime());

  async function run(
    task: () => Promise<unknown>,
    success: string,
    fallback: string,
  ) {
    setBusy(true);
    try {
      await task();
      toast.success(success);
      await onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  }

  async function addDeduction(event: FormEvent) {
    event.preventDefault();
    await run(
      () =>
        api.post(
          `/admin/lease-lifecycle/deposits/${disposition.id}/deductions`,
          { category, description, amount: Number(amount) },
        ),
      "Deduction added",
      "Unable to add deduction",
    );
    setDescription("");
    setAmount("");
  }

  async function uploadProof(file?: File) {
    if (!file) return;
    await run(
      async () => {
        const signed = (await api.post(
          `/admin/lease-lifecycle/deposits/${disposition.id}/proof-upload`,
          { fileName: file.name, contentType: file.type, sizeBytes: file.size },
        )) as { bucket: string; path: string; token: string };
        const { error } = await supabase.storage
          .from(signed.bucket)
          .uploadToSignedUrl(signed.path, signed.token, file, {
            contentType: file.type,
          });
        if (error) throw error;
        await api.post(
          `/admin/lease-lifecycle/deposits/${disposition.id}/proof`,
          {
            path: signed.path,
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          },
        );
      },
      "Return proof attached",
      "Unable to attach return proof",
    );
    if (fileInput.current) fileInput.current.value = "";
  }

  const daysLeft = Math.ceil(
    (new Date(disposition.dueDate).getTime() - renderedAt) / 86_400_000,
  );
  return (
    <div className="rounded-xl border border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <ReceiptText className="mt-0.5 size-5 text-primary" />
          <div>
            <h3 className="font-semibold">Security deposit disposition</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Immutable ledger with itemization, return deadline, and retained
              proof.
            </p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="capitalize">
            {statusLabel(disposition.status)}
          </Badge>
          <p
            className={`mt-2 text-xs ${daysLeft < 0 && disposition.status !== "RETURNED" ? "text-destructive" : "text-muted-foreground"}`}
          >
            Due {shortDate(disposition.dueDate)} ·{" "}
            {daysLeft >= 0
              ? `${daysLeft} days left`
              : `${Math.abs(daysLeft)} days overdue`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Verified held" value={money(disposition.amountHeld)} />
        <Metric label="Deductions" value={money(disposition.deductionsTotal)} />
        <Metric label="Return amount" value={money(disposition.refundAmount)} />
      </div>

      {disposition.deductions.length ? (
        <div className="mt-5 divide-y divide-border rounded-xl border border-border">
          {disposition.deductions.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 p-4"
            >
              <div>
                <p className="font-medium">{statusLabel(item.category)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium tabular-nums">
                  {money(item.amount)}
                </span>
                {disposition.status === "DRAFT" ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${item.description}`}
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          api.delete(
                            `/admin/lease-lifecycle/deductions/${item.id}`,
                          ),
                        "Deduction removed",
                        "Unable to remove deduction",
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {disposition.status === "DRAFT" ? (
        <form
          className="mt-5 rounded-xl bg-secondary/25 p-4"
          onSubmit={addDeduction}
        >
          <p className="font-semibold">Add an itemized deduction</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[12rem_1fr_10rem_auto]">
            <div>
              <Label htmlFor="deposit-deduction-category">Category</Label>
              <select
                id="deposit-deduction-category"
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "CLEANING",
                  "DAMAGE",
                  "UNPAID_RENT",
                  "LATE_FEES",
                  "UTILITIES",
                  "KEY_REPLACEMENT",
                  "OTHER",
                ].map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                className="mt-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                minLength={3}
                required
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                className="mt-2"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <Button className="self-end" disabled={busy}>
              <Plus /> Add
            </Button>
          </div>
          <Button
            className="mt-4"
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  api.post(
                    `/admin/lease-lifecycle/deposits/${disposition.id}/finalize`,
                    {},
                  ),
                "Itemized statement finalized and sent",
                "Unable to finalize itemization",
              )
            }
          >
            Finalize and notify resident
          </Button>
        </form>
      ) : null}

      {disposition.status === "ITEMIZED" ? (
        <form
          className="mt-5 rounded-xl bg-secondary/25 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () =>
                api.post(
                  `/admin/lease-lifecycle/deposits/${disposition.id}/issue`,
                  {
                    returnMethod,
                    returnReference,
                    internalNotes: notes || undefined,
                    requestId: crypto.randomUUID(),
                  },
                ),
              "Deposit return issued",
              "Unable to issue return",
            );
          }}
        >
          <p className="font-semibold">Record the issued return</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This records the return. It does not initiate an ACH transfer.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="deposit-return-method">Method</Label>
              <select
                id="deposit-return-method"
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
                value={returnMethod}
                onChange={(e) => setReturnMethod(e.target.value)}
              >
                {["CHECK", "ACH", "CASH", "OTHER"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Check / ACH / receipt reference</Label>
              <Input
                className="mt-2"
                value={returnReference}
                onChange={(e) => setReturnReference(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Internal notes</Label>
              <Input
                className="mt-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-4" disabled={busy}>
            Record return issued
          </Button>
        </form>
      ) : null}

      {disposition.status === "ISSUED" ? (
        <div className="mt-5 rounded-xl bg-secondary/25 p-4">
          <p className="font-semibold">Proof and completion</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {disposition.returnMethod} · reference {disposition.returnReference}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              <FileUp />{" "}
              {disposition.proofStoragePath ? "Replace proof" : "Upload proof"}
            </Button>
            <input
              ref={fileInput}
              className="hidden"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => void uploadProof(e.target.files?.[0])}
            />
            {disposition.proofStoragePath ? (
              <Button
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api.post(
                        `/admin/lease-lifecycle/deposits/${disposition.id}/returned`,
                        {},
                      ),
                    "Deposit return completed",
                    "Unable to complete return",
                  )
                }
              >
                <CheckCircle2 /> Mark returned
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {disposition.status === "DISPUTED" ? (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-semibold">Resident dispute</p>
          <p className="mt-2 text-sm">{disposition.disputeReason}</p>
          <div className="mt-4">
            <Label>Resolution notes</Label>
            <Textarea
              className="mt-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
            />
            <Button
              className="mt-3"
              disabled={busy || notes.trim().length < 3}
              onClick={() =>
                run(
                  () =>
                    api.post(
                      `/admin/lease-lifecycle/deposits/${disposition.id}/resolve-dispute`,
                      { reason: notes },
                    ),
                  "Dispute resolved",
                  "Unable to resolve dispute",
                )
              }
            >
              Resolve dispute
            </Button>
          </div>
        </div>
      ) : null}

      {disposition.ledgerEntries.length ? (
        <div className="mt-5">
          <p className="text-sm font-semibold">Deposit ledger</p>
          <div className="mt-2 divide-y divide-border">
            {disposition.ledgerEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{statusLabel(entry.entryType)}</p>
                  <p className="text-muted-foreground">{entry.description}</p>
                </div>
                <span className="tabular-nums">{money(entry.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
