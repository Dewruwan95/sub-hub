"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Login() {
  const { status } = useSession();
  const router = useRouter();

  // User sudah log වී ඇත්නම් කෙළින්ම Home Page (/) එකට යවන්න
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">
          Checking authentication...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md space-y-6 shadow-2xl text-center">
        {/* SubHub Logo & Branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-gray-800/50 rounded-2xl border border-gray-700/50 flex items-center justify-center">
            <div
              className="w-12 h-12 bg-linear-to-r from-blue-400 via-purple-400 to-pink-500"
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
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-linear-to-r from-blue-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              Welcome to SubHub 🎬
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Sign in with your Google account to start translating subtitles
              with Gemini AI
            </p>
          </div>
        </div>

        {/* Google Sign In Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-500">
          Secure authentication powered by NextAuth & Google Cloud
        </p>
      </div>
    </div>
  );
}
