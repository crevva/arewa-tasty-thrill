import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";

  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(returnTo, url.origin));
}
