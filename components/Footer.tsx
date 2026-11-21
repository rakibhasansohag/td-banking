import { logoutAccount } from "@/lib/actions/auth.actions";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

interface FooterProps {
  user: {
    firstName: string;
    name: string;
    email: string;
  };
  type?: string;
}

const Footer = ({ user, type = "desktop" }: FooterProps) => {
  const router = useRouter();

  const handleLogOut = async () => {
    await logoutAccount();
    toast.success("Logged Out successfully");
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <footer className="footer flex items-center space-x-4 p-4 bg-gray-100">
      <div className={type === "mobile" ? "footer_name-mobile" : "footer_name"}>
        <p className="text-xl font-bold text-gray-700">{user?.firstName[0]}</p>
      </div>

      <div
        className={type === "mobile" ? "footer_email-mobile" : "footer_email"}
      >
        <h1 className="text-14 truncate font-normal text-gray-600">
          {user?.firstName}
        </h1>
        <p className="text-14 truncate font-semibold text-gray-700">
          {user?.email}
        </p>
      </div>

      <div className="relative group">
        <button
          type="button"
          aria-label="Log out"
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
