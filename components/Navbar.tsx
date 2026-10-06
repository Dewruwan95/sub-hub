"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

export default function Navbar() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand Name */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div
            className="w-9 h-9 bg-linear-to-r from-blue-400 via-purple-400 to-pink-500"
            style={{
              maskImage: "url(/logo.svg)",
              maskRepeat: "no-repeat",
              maskSize: "contain",
              maskPosition: "center",
              WebkitMaskImage: "url(/logo.svg)",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              WebkitMaskPosition: "center",
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-linear-to-r from-blue-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
                SubHub
              </span>
              <span className="bg-blue-500/10 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-500/20">
                V 1.0
              </span>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block">
              AI Subtitle Translation & Studio
            </p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/50">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Gemini Engine Ready
          </div>

          {/* User Logged In State Check */}
          {status === "authenticated" && (
            <div className="flex items-center gap-3">
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User Profile"}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full border border-gray-700 object-cover"
                />
              )}
              <button
                onClick={handleLogout}
                className="bg-gray-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-gray-300 text-xs font-medium px-3.5 py-1.5 rounded-lg border border-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
