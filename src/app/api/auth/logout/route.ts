import { NextResponse } from "next/server";
import { logoutSession } from "@/lib/session";

export async function POST() {
  await logoutSession();
  return NextResponse.json({ success: true, redirect: "/login" });
}
