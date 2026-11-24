"use client";

import { sidebarLinks } from "@/constants";
import { cn } from "@/lib/utils";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "./Footer";
import AddDemoBank from "./AddDemoBank";

const Sidebar = ({ user }: { user: { email: string; firstName: string; lastName: string; name: string } }) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const tablet = window.matchMedia("(max-width: 1023px)");
    const syncWithViewport = () => setIsCollapsed(tablet.matches);

    syncWithViewport();
    tablet.addEventListener("change", syncWithViewport);
    return () => tablet.removeEventListener("change", syncWithViewport);
  }, []);

  return (
    <section className={cn("sidebar", isCollapsed && "sidebar-collapsed")}>
      <div className="sidebar-heading">
        <Link href="/" className="sidebar-brand" aria-label="Horizon home">
          <Image
            src="/icons/logo.svg"
            width={34}
            height={34}
            alt=""
            className="size-7 shrink-0"
          />
          <h1 className="sidebar-logo">Horizon</h1>
        </Link>
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className={cn("size-5 transition-transform duration-300 motion-reduce:transition-none", isCollapsed && "size-7 rotate-180")}
          >
            <path d="m14 5-7 7 7 7M20 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <nav className="flex flex-col gap-4">
        {sidebarLinks?.map((item) => {
          const isActive =
            pathname === item.route || pathname.startsWith(`${item.route}/`);

          return (
            <Link
              href={item.route}
              key={item.label}
              className={cn("sidebar-link", { "bg-bank-gradient": isActive })}
              title={isCollapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative size-7">
                <Image
                  src={item.imgURL}
                  alt={item.label}
                  fill
                  className={cn({
                    "brightness-[3] invert-0": isActive,
                  })}
                />
              </div>
              <p className={cn("sidebar-label", { "!text-white": isActive })}>
                {item.label}
              </p>
            </Link>
          );
        })}

        <AddDemoBank variant="sidebar" collapsed={isCollapsed} />
      </nav>

      <Footer user={user} collapsed={isCollapsed} />
    </section>
  );
};

export default Sidebar;
