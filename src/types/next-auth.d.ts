import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isSuperintendent: boolean;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isSuperintendent: boolean;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isSuperintendent: boolean;
    isAdmin: boolean;
  }
}
