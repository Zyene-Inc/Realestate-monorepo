"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

const VerdocsSign = dynamic(
  () => import("@verdocs/web-sdk-react").then((module) => module.VerdocsSign),
  { ssr: false },
);

type SigningSession = {
  envelopeId: string;
  roleName: string;
  inviteCode: string;
};

export function VerdocsSigningPanel({
  endpoint,
  onFinished,
}: {
  endpoint: string;
  onFinished: () => void;
}) {
  const [session, setSession] = useState<SigningSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .post(endpoint, {})
      .then((value: SigningSession) => active && setSession(value))
      .catch(
        (reason: unknown) =>
          active &&
          setError(getErrorMessage(reason, "Unable to start secure signing")),
      );
    return () => {
      active = false;
    };
  }, [endpoint]);

  if (error) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="font-semibold">Signing could not be opened</p>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Preparing secure signing…
      </div>
    );
  }

  return (
    <div className="min-h-[70dvh] overflow-hidden rounded-xl bg-white text-black">
      <div id={`verdocs-header-${session.envelopeId}`} />
      <VerdocsSign
        envelopeId={session.envelopeId}
        roleId={session.roleName}
        inviteCode={session.inviteCode}
        headerTargetId={`verdocs-header-${session.envelopeId}`}
        toolbarStyle="controls"
        onEnvelopeUpdated={(event) => {
          if (event.detail.envelope.signed) onFinished();
        }}
        onSdkError={(event) =>
          setError(
            event.detail?.message || "Verdocs could not load the document",
          )
        }
      />
    </div>
  );
}
