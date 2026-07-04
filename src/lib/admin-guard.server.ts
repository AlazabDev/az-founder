/**
 * Shared: check the caller is admin (server-side).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireAdmin(supabase: any, userId: string): Promise<void> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin only");
}
