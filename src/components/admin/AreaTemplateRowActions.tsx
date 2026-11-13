"use client";

import { useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteAreaTemplate,
  reorderAreaTemplate,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

export function AreaTemplateRowActions({
  areaTemplateId,
  isFirst,
  isLast,
}: {
  areaTemplateId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await reorderAreaTemplate(areaTemplateId, direction);
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteAreaTemplate(areaTemplateId);
    });
  }

  return (
    <div className="flex items-center gap-0.5">
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
      <Button type="button" size="icon-sm" variant="ghost" disabled={isPending} onClick={remove} title="Delete area">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        )}
      </Button>
    </div>
  );
}
