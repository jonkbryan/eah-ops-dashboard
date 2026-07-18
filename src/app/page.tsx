import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.isAdmin) {
    redirect("/admin");
  }

  if (session.user.isSuperintendent) {
    redirect("/superintendent");
  }

  // Account exists but has no role assigned yet.
  redirect("/login");
}
