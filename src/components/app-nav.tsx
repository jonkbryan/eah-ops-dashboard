import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "./sign-out-button";

export async function AppNav() {
  const session = await auth();
  if (!session?.user) return null;

  const { name, isAdmin, isSuperintendent } = session.user;

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="font-semibold text-gray-900 shrink-0">
            EAH Ops
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {isSuperintendent && (
              <Link
                href="/superintendent"
                className="text-gray-600 hover:text-gray-900"
              >
                My Queue
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-gray-500 hidden sm:inline truncate max-w-[10rem]">
            {name}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
