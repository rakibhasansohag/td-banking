"use client";

import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { sidebarLinks } from "@/constants";
import { cn } from "@/lib/utils";
import type { AuthUserView } from "@/lib/auth.types";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AddDemoBank from "./AddDemoBank";
import Footer from "./Footer";

export default function MobileNav({ user }: { user: AuthUserView }) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger aria-label="Open navigation" className="grid size-11 place-items-center rounded-lg hover:bg-gray-100">
        <Image src="/icons/hamburger.svg" width={26} height={26} alt="" />
      </SheetTrigger>
      <SheetContent side="left" className="mobile-drawer flex h-dvh w-[min(20rem,calc(100vw-2.5rem))] flex-col gap-0 border-none bg-white px-4 py-5">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Navigate to account pages and banking tools.</SheetDescription>
        <SheetClose asChild>
          <Link href="/" className="mb-6 flex w-fit items-center gap-2 px-3 pr-10" aria-label="Horizon home">
            <Image src="/icons/logo.svg" width={30} height={30} alt="" />
            <span className="text-26 font-ibm-plex-serif font-bold text-black-1">Horizon</span>
          </Link>
        </SheetClose>
        <nav aria-label="Banking" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {sidebarLinks.map((item) => {
            const active = pathname === item.route || pathname.startsWith(`${item.route}/`);
            return (
              <SheetClose asChild key={item.route}>
                <Link href={item.route} aria-current={active ? "page" : undefined} className={cn("sidebar-link font-semibold text-black-2", active && "bg-bank-gradient text-white")}>
                  <Image src={item.imgURL} width={28} height={28} alt="" className={cn("size-7 shrink-0", active && "brightness-[3]")} />
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
          <AddDemoBank variant="sidebar" />
        </nav>
        <Footer user={user} type="mobile" />
      </SheetContent>
    </Sheet>
  );
}
