"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquareText, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import {
  createWebsiteLeadNote,
  leadTime,
  listWebsiteLeadNotes,
  type WebsiteLeadNote,
} from "@/lib/website-leads";

type LeadNotesPanelProps = {
  leadId: string;
  initialCount: number;
};

export function LeadNotesPanel({ leadId, initialCount }: LeadNotesPanelProps) {
  const [notes, setNotes] = useState<WebsiteLeadNote[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listWebsiteLeadNotes(leadId)
      .then((page) => {
        if (!active) return;
        setNotes(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(getErrorMessage(error, "Unable to load internal notes"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [leadId]);

  const addNote = async () => {
    const normalized = body.trim();
    if (!normalized) return;
    setSaving(true);
    try {
      const note = await createWebsiteLeadNote(leadId, normalized);
      setNotes((current) => [note, ...current]);
      setBody("");
      toast.success("Internal note added");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to add internal note"));
    } finally {
      setSaving(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listWebsiteLeadNotes(leadId, nextCursor);
      setNotes((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load older notes"));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby="lead-notes-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="lead-notes-title" className="flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
            Internal notes
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Private handoff and follow-up context for Johnson Realty staff.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
          {Math.max(initialCount, notes.length)}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor={`lead-note-${leadId}`}>Add a note</Label>
        <Textarea
          id={`lead-note-${leadId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Record screening details, contact attempts, or tour follow-up…"
          maxLength={4000}
          className="min-h-24"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => void addNote()}
            disabled={saving || !body.trim()}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Add note
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3" aria-live="polite">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading notes…
          </div>
        ) : notes.length === 0 ? (
          <p className="rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            No internal notes yet.
          </p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="rounded-xl border bg-background px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {note.author.email} · {leadTime(note.createdAt)}
              </p>
            </article>
          ))
        )}
        {nextCursor ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            Load older notes
          </Button>
        ) : null}
      </div>
    </section>
  );
}
