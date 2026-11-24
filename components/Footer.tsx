import { logoutAccount } from "@/lib/actions/auth.actions";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

interface FooterProps {
  user: {
    firstName: string;
    name: string;
    email: string;
  };
  type?: string;
  collapsed?: boolean;
}

const Footer = ({ user, type = "desktop", collapsed = false }: FooterProps) => {
  const router = useRouter();
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ left: number; bottom: number; container: Element } | null>(null);

  const showEmail = (email: HTMLElement) => {
    if (email.scrollWidth <= email.clientWidth) return;
    const bounds = email.getBoundingClientRect();
    const tooltipWidth = Math.min(360, window.innerWidth - 24);
    setTooltip({
      left: Math.max(12, Math.min(bounds.left, window.innerWidth - tooltipWidth - 12)),
      bottom: window.innerHeight - bounds.top + 6,
      container: email.closest('[role="dialog"]') ?? document.body,
    });
  };

  const handleLogOut = async () => {
    await logoutAccount();
    toast.success("Logged Out successfully");
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <footer className={`footer${collapsed ? " footer-collapsed" : ""}`}>
      <div className={type === "mobile" ? "footer_name-mobile" : "footer_name"} aria-hidden={collapsed}>
        <p className="text-xl font-bold text-gray-700">{user?.firstName[0]}</p>
      </div>

      <div
        className={`${type === "mobile" ? "footer_email-mobile" : "footer_email"}${collapsed ? " sidebar-footer-label" : ""}`}
      >
        <h1 className="text-14 truncate font-normal text-gray-600">
          {user?.firstName}
        </h1>
        <p
          className="text-14 truncate rounded-sm font-semibold text-gray-700 focus-visible:outline-2 focus-visible:outline-blue-500"
          tabIndex={collapsed ? -1 : 0}
          aria-describedby={tooltip && !collapsed ? tooltipId : undefined}
          onPointerEnter={(event) => showEmail(event.currentTarget)}
          onPointerLeave={(event) => {
            if (document.activeElement !== event.currentTarget) setTooltip(null);
          }}
          onFocus={(event) => showEmail(event.currentTarget)}
          onBlur={() => setTooltip(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setTooltip(null);
          }}
        >
          {user?.email}
        </p>
        {tooltip && !collapsed && createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[60] w-max max-w-[min(360px,calc(100vw-24px))] rounded-md bg-gray-900 px-3 py-2 text-xs font-medium break-all text-white shadow-lg"
            style={{ left: tooltip.left, bottom: tooltip.bottom }}
          >
            {user.email}
          </span>,
          tooltip.container,
        )}
      </div>

      <div className="relative group">
        <button
          type="button"
          aria-label="Log out"
          title={collapsed ? "Log out" : undefined}
          className="footer_image cursor-pointer"
          onClick={handleLogOut}
        >
          <Image
            src="/icons/logout.svg"
            width={24}
            height={24}
            alt=""
          />
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
          Logout
        </div>
      </div>
    </footer>
  );
};

export default Footer;
