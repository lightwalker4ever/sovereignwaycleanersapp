"use client";

import { useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteStandard,
  reorderStandard,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

export function StandardRowActions({
  standardId,
  listId,
  isFirst,
  isLast,
}: {
  standardId: string;
  listId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await reorderStandard(standardId, listId, direction);
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteStandard(standardId);
    });
  }

  return (
    <div className="flex flex-col items-center gap-1 pt-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={isPending || isFirst}
        onClick={() => move("up")}
        title="Move up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={isPending || isLast}
        onClick={() => move("down")}
        title="Move down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={isPending}
        onClick={remove}
        title="Delete standard"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        )}
      </Button>
    </div>
  );
}
