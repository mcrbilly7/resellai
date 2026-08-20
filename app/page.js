import { redirect } from "next/navigation";
import { getSessionUserId } from "../lib/auth";

export default function Home() {
  const userId = getSessionUserId();
  redirect(userId ? "/settings" : "/login");
}
