"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { addDemoBankAccount } from "@/lib/actions/banking-ui.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AddDemoBank({ variant = "default", collapsed = false }: { variant?: "default" | "primary" | "ghost"; collapsed?: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [requestKey, setRequestKey] = useState("");

  const addAccount = async () => {
    if (isPending) return;
    const key = requestKey || crypto.randomUUID();
    setRequestKey(key);
    setIsPending(true);
    try {
      await addDemoBankAccount(key);
      setRequestKey("");
      toast.success("Demo bank account added");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add account");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      onClick={addAccount}
      disabled={isPending}
      aria-label={isPending ? "Adding demo bank" : "Add demo bank"}
      title={collapsed ? (isPending ? "Adding demo bank" : "Add demo bank") : undefined}
      className={cn(`bank-action-${variant}`, collapsed && "size-11 gap-0 p-0")}
    >
      <Image
        src="/icons/connect-bank.svg"
        alt=""
        width={28}
        height={28}
        className={collapsed ? "size-7 shrink-0" : "size-6"}
      />
      <span className={collapsed ? "sidebar-action-label" : "text-[16px] font-semibold text-black-2"}>
        {isPending ? "Adding demo bank…" : "Add demo bank"}
      </span>
    </Button>
  );
}
