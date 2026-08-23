"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  CommissionDialogs,
  type CommissionEntryForm,
} from "./_components/commission-dialogs";
import { CommissionLedgerContent } from "./_components/commission-ledger-content";
import {
  type CursorPage,
  type EligibleSaleListing,
  type SaleCommission,
  type SaleCommissionReport,
  type SaleCommissionStatus,
} from "@/lib/sale-commissions";

const today = () => new Date().toISOString().slice(0, 10);

const emptyEntry = (): CommissionEntryForm => ({
  propertyId: "",
  salePrice: "",
  commissionAmount: "",
  receivedAt: today(),
  paymentMethod: "CHECK",
  referenceNumber: "",
  notes: "",
});

function receivedAtIso(value: string) {
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

async function fetchLedgerData(query: string, reportQuery: string) {
  const [page, revenue, sold] = await Promise.all([
    api.get(`/admin/sale-commissions${query}`) as Promise<
      CursorPage<SaleCommission>
    >,
    api.get(
      `/admin/sale-commissions/report${reportQuery}`,
    ) as Promise<SaleCommissionReport>,
    api.get("/admin/sale-commissions/eligible-listings?limit=100") as Promise<
      CursorPage<EligibleSaleListing>
    >,
  ]);
  return { page, revenue, sold };
}

type LedgerState = {
  items: SaleCommission[];
  nextCursor: string | null;
  report: SaleCommissionReport | null;
  eligible: EligibleSaleListing[];
  eligibleCursor: string | null;
  status: "ALL" | SaleCommissionStatus;
  loading: boolean;
  loadingMore: boolean;
  reportFrom: string;
  reportTo: string;
};

type LedgerAction =
  | {
      type: "loaded";
      page: CursorPage<SaleCommission>;
      report: SaleCommissionReport;
      eligible: CursorPage<EligibleSaleListing>;
    }
  | { type: "loading-finished" }
  | { type: "loading-more"; value: boolean }
  | { type: "items-appended"; page: CursorPage<SaleCommission> }
  | { type: "eligible-appended"; page: CursorPage<EligibleSaleListing> }
  | { type: "status-changed"; value: "ALL" | SaleCommissionStatus }
  | { type: "report-from-changed"; value: string }
  | { type: "report-to-changed"; value: string };

function ledgerReducer(state: LedgerState, action: LedgerAction): LedgerState {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        items: action.page.items,
        nextCursor: action.page.nextCursor,
        report: action.report,
        eligible: action.eligible.items,
        eligibleCursor: action.eligible.nextCursor,
        loading: false,
      };
    case "loading-finished":
      return { ...state, loading: false };
    case "loading-more":
      return { ...state, loadingMore: action.value };
    case "items-appended":
      return {
        ...state,
        items: [...state.items, ...action.page.items],
        nextCursor: action.page.nextCursor,
      };
    case "eligible-appended":
      return {
        ...state,
        eligible: [...state.eligible, ...action.page.items],
        eligibleCursor: action.page.nextCursor,
      };
    case "status-changed":
      return { ...state, status: action.value };
    case "report-from-changed":
      return { ...state, reportFrom: action.value };
    case "report-to-changed":
      return { ...state, reportTo: action.value };
  }
}

export default function SaleCommissionLedgerPage() {
  const [ledger, dispatchLedger] = useReducer(
    ledgerReducer,
    null,
    (): LedgerState => ({
      items: [],
      nextCursor: null,
      report: null,
      eligible: [],
      eligibleCursor: null,
      status: "ALL",
      loading: true,
      loadingMore: false,
      reportFrom: `${new Date().getUTCFullYear()}-01-01`,
      reportTo: today(),
    }),
  );
  const {
    items,
    nextCursor,
    report,
    eligible,
    eligibleCursor,
    status,
    loading,
    loadingMore,
    reportFrom,
    reportTo,
  } = ledger;
  const [createOpen, setCreateOpen] = useState(false);
  const [entry, setEntry] = useState<CommissionEntryForm>(emptyEntry);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SaleCommission | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [correction, setCorrection] = useState<CommissionEntryForm>(emptyEntry);
  const [correctionReason, setCorrectionReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const query = useMemo(
    () => (status === "ALL" ? "?limit=25" : `?limit=25&status=${status}`),
    [status],
  );
  const reportQuery = useMemo(() => {
    const parameters = new URLSearchParams();
    if (reportFrom) parameters.set("from", reportFrom);
    if (reportTo) parameters.set("to", reportTo);
    const serialized = parameters.toString();
    return serialized ? `?${serialized}` : "";
  }, [reportFrom, reportTo]);

  const load = useCallback(async () => {
    try {
      const { page, revenue, sold } = await fetchLedgerData(query, reportQuery);
      dispatchLedger({
        type: "loaded",
        page,
        report: revenue,
        eligible: sold,
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Unable to load the commission ledger"),
      );
    } finally {
      dispatchLedger({ type: "loading-finished" });
    }
  }, [query, reportQuery]);

  useEffect(() => {
    let ignore = false;
    void fetchLedgerData(query, reportQuery)
      .then(({ page, revenue, sold }) => {
        if (ignore) return;
        dispatchLedger({
          type: "loaded",
          page,
          report: revenue,
          eligible: sold,
        });
      })
      .catch((error: unknown) => {
        if (!ignore) {
          toast.error(
            getErrorMessage(error, "Unable to load the commission ledger"),
          );
        }
      })
      .finally(() => {
        if (!ignore) dispatchLedger({ type: "loading-finished" });
      });
    return () => {
      ignore = true;
    };
  }, [query, reportQuery]);

  const loadMore = async () => {
    if (!nextCursor) return;
    dispatchLedger({ type: "loading-more", value: true });
    try {
      const separator = query.includes("?") ? "&" : "?";
      const page = (await api.get(
        `/admin/sale-commissions${query}${separator}cursor=${encodeURIComponent(nextCursor)}`,
      )) as CursorPage<SaleCommission>;
      dispatchLedger({ type: "items-appended", page });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load more records"));
    } finally {
      dispatchLedger({ type: "loading-more", value: false });
    }
  };

  const loadMoreListings = async () => {
    if (!eligibleCursor) return;
    try {
      const page = (await api.get(
        `/admin/sale-commissions/eligible-listings?limit=100&cursor=${encodeURIComponent(eligibleCursor)}`,
      )) as CursorPage<EligibleSaleListing>;
      dispatchLedger({ type: "eligible-appended", page });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load more sold listings"));
    }
  };

  const openDetails = async (id: string) => {
    setDetailOpen(true);
    setSelected(null);
    try {
      setSelected(await api.get(`/admin/sale-commissions/${id}`));
    } catch (error: unknown) {
      setDetailOpen(false);
      toast.error(getErrorMessage(error, "Unable to open this record"));
    }
  };

  const submitEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!entry.propertyId || !entry.commissionAmount || !entry.receivedAt) {
      toast.error("Choose a sold listing and enter the receipt details");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/sale-commissions", {
        clientRequestId: requestId,
        propertyId: entry.propertyId,
        salePrice: entry.salePrice || undefined,
        commissionAmount: entry.commissionAmount,
        receivedAt: receivedAtIso(entry.receivedAt),
        paymentMethod: entry.paymentMethod,
        referenceNumber: entry.referenceNumber || undefined,
        notes: entry.notes || undefined,
      });
      toast.success("Commission receipt recorded");
      setCreateOpen(false);
      setEntry(emptyEntry());
      setRequestId(crypto.randomUUID());
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to record commission"));
    } finally {
      setSaving(false);
    }
  };

  const beginCorrection = () => {
    if (!selected) return;
    setCorrection({
      propertyId: selected.propertyId,
      salePrice: selected.salePrice ?? "",
      commissionAmount: selected.commissionAmount,
      receivedAt: selected.receivedAt.slice(0, 10),
      paymentMethod: selected.paymentMethod,
      referenceNumber: selected.referenceNumber ?? "",
      notes: selected.notes ?? "",
    });
    setCorrectionReason("");
    setCorrectOpen(true);
  };

  const submitCorrection = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const updated = (await api.patch(
        `/admin/sale-commissions/${selected.id}/correct`,
        {
          salePrice: correction.salePrice || null,
          commissionAmount: correction.commissionAmount,
          receivedAt: receivedAtIso(correction.receivedAt),
          paymentMethod: correction.paymentMethod,
          referenceNumber: correction.referenceNumber || null,
          notes: correction.notes || null,
          reason: correctionReason,
        },
      )) as SaleCommission;
      setSelected(updated);
      setCorrectOpen(false);
      toast.success("Correction saved to the audit timeline");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to correct this record"));
    } finally {
      setSaving(false);
    }
  };

  const submitVoid = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const updated = (await api.post(
        `/admin/sale-commissions/${selected.id}/void`,
        { reason: voidReason },
      )) as SaleCommission;
      setSelected(updated);
      setVoidOpen(false);
      setVoidReason("");
      toast.success("Commission voided; the history remains preserved");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to void this record"));
    } finally {
      setSaving(false);
    }
  };

  const selectedListing = eligible.find((item) => item.id === entry.propertyId);

  return (
    <div className="space-y-8">
      <CommissionLedgerContent
        report={report}
        reportFrom={reportFrom}
        setReportFrom={(value) =>
          dispatchLedger({ type: "report-from-changed", value })
        }
        reportTo={reportTo}
        setReportTo={(value) =>
          dispatchLedger({ type: "report-to-changed", value })
        }
        items={items}
        nextCursor={nextCursor}
        status={status}
        setStatus={(value) => dispatchLedger({ type: "status-changed", value })}
        loading={loading}
        loadingMore={loadingMore}
        onCreate={() => setCreateOpen(true)}
        onLoad={load}
        onLoadMore={loadMore}
        onOpenDetails={openDetails}
      />

      <CommissionDialogs
        create={{
          open: createOpen,
          setOpen: setCreateOpen,
          entry,
          setEntry,
          eligible,
          eligibleCursor,
          selectedListing,
          loadMoreListings,
          submit: submitEntry,
        }}
        details={{
          open: detailOpen,
          setOpen: setDetailOpen,
          selected,
          beginCorrection,
          beginVoid: () => setVoidOpen(true),
        }}
        correction={{
          open: correctOpen,
          setOpen: setCorrectOpen,
          form: correction,
          setForm: setCorrection,
          reason: correctionReason,
          setReason: setCorrectionReason,
          submit: submitCorrection,
        }}
        voiding={{
          open: voidOpen,
          setOpen: setVoidOpen,
          reason: voidReason,
          setReason: setVoidReason,
          submit: submitVoid,
        }}
        saving={saving}
      />
    </div>
  );
}
