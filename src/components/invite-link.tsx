"use client";

import { useEffect, useState } from "react";
import { useToast } from "./toast";
import { Button } from "./ui";
import { ShareIcon } from "./icons";

export function InviteLink({ token, inviteeName }: { token: string; inviteeName?: string }) {
  const [url, setUrl] = useState("");
  const toast = useToast();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- origin is only known in the browser
  useEffect(() => setUrl(`${window.location.origin}/invite/${token}`), [token]);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="space-y-2">
      <code className="block break-all rounded-xl bg-card p-3 text-sm ring-1 ring-line">{url || "…"}</code>
      <div className="flex gap-2">
        {canShare && (
          <Button
            className="flex-1"
            onClick={() =>
              navigator
                .share({
                  title: "Join our household",
                  text: `${inviteeName ? `${inviteeName}, j` : "J"}oin our household on Life Partner:`,
                  url,
                })
                .catch(() => {})
            }
          >
            <ShareIcon className="h-5 w-5" /> Share
          </Button>
        )}
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => navigator.clipboard.writeText(url).then(() => toast({ message: "Link copied" }))}
        >
          Copy link
        </Button>
      </div>
    </div>
  );
}
