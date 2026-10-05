import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useIsAdmin } from "@/lib/useSession";
import { dong, shortDate } from "@/lib/format";
import { PLATFORM_LABEL, type PlatformSlug } from "@/lib/convert";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Quản trị — HoànTiền" },
      { name: "description", content: "Duyệt yêu cầu rút tiền và quản lý hoa hồng người dùng." },
      { property: "og:title", content: "Quản trị — HoànTiền" },
      { property: "og:description", content: "Khu vực quản trị nội bộ của HoànTiền." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const isAdmin = useIsAdmin(user?.id);
  const queryClient = useQueryClient();

  const withdrawals = useQuery({
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const platforms = useQuery({
    queryKey: ["admin-platforms"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("platforms").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [rates, setRates] = useState<Record<string, string>>({});
  const [affiliates, setAffiliates] = useState<Record<string, string>>({});

  if (!isAdmin) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Bạn không có quyền truy cập khu vực này.
      </div>
    );
  }

  async function setWithdrawalStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase
      .from("withdrawals")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "approved" ? "Đã duyệt" : "Đã từ chối");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    }
  }

  async function setOrderStatus(id: string, status: "confirmed" | "rejected") {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã cập nhật đơn hàng");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  }

  async function savePlatform(slug: string) {
    const patch: { cashback_rate?: number; affiliate_value?: string } = {};
    if (rates[slug] !== undefined) patch.cashback_rate = Number(rates[slug]);
    if (affiliates[slug] !== undefined) patch.affiliate_value = affiliates[slug];
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase.from("platforms").update(patch).eq("slug", slug);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã lưu");
      queryClient.invalidateQueries({ queryKey: ["admin-platforms"] });
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
    }
  }

  const pendingCount = (withdrawals.data ?? []).filter((w) => w.status === "pending").length;

  return (
    <div className="py-6 lg:py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Khu quản trị</h1>
        <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
          ADMIN
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-3xl p-5">
          <p className="text-xs text-muted-foreground">Yêu cầu rút chờ duyệt</p>
          <p className="mono mt-1 text-3xl font-extrabold text-amber">{pendingCount}</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-xs text-muted-foreground">Đơn hàng ghi nhận</p>
          <p className="mono mt-1 text-3xl font-extrabold">{orders.data?.length ?? 0}</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <p className="text-xs text-muted-foreground">Tổng hoa hồng</p>
          <p className="mono mt-1 text-3xl font-extrabold text-emerald">
            {dong((orders.data ?? []).reduce((sum, o) => sum + Number(o.commission), 0))}
          </p>
        </div>
      </div>

      <div className="glass mt-4 rounded-3xl p-5">
        <h2 className="text-sm font-bold">Yêu cầu rút tiền</h2>
        {withdrawals.data && withdrawals.data.length > 0 ? (
          <div className="mt-3 space-y-2">
            {withdrawals.data.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="mono text-sm font-semibold">{dong(w.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.method === "momo" ? "MoMo" : "Ngân hàng"} · {w.account} · {w.holder ?? "—"} ·{" "}
                    {shortDate(w.created_at)}
                  </p>
                </div>
                {w.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void setWithdrawalStatus(w.id, "approved")}
                      className="rounded-full bg-emerald px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => void setWithdrawalStatus(w.id, "rejected")}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      Từ chối
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {w.status === "approved" ? "Đã chuyển" : "Đã từ chối"}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Chưa có yêu cầu nào.</p>
        )}
      </div>

      <div className="glass mt-4 rounded-3xl p-5">
        <h2 className="text-sm font-bold">Đơn hàng &amp; hoa hồng</h2>
        {orders.data && orders.data.length > 0 ? (
          <div className="mt-3 space-y-2">
            {orders.data.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{o.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {PLATFORM_LABEL[o.platform as PlatformSlug] ?? o.platform} ·{" "}
                    {dong(o.order_amount)} · hoa hồng {dong(o.commission)}
                  </p>
                </div>
                {o.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void setOrderStatus(o.id, "confirmed")}
                      className="rounded-full bg-emerald px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Xác nhận
                    </button>
                    <button
                      onClick={() => void setOrderStatus(o.id, "rejected")}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      Huỷ
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">{o.status}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Chưa có đơn hàng nào được ghi nhận.</p>
        )}
      </div>

      <div className="glass mt-4 rounded-3xl p-5">
        <h2 className="text-sm font-bold">Cấu hình sàn</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Nhập mã tiếp thị của bạn ở từng sàn và mức hoàn tiền hiển thị cho người dùng.
        </p>
        <div className="mt-3 space-y-2">
          {(platforms.data ?? []).map((p) => (
            <div
              key={p.slug}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/70 px-4 py-3"
            >
              <span className="w-28 text-sm font-semibold">{p.name}</span>
              <input
                defaultValue={String(p.cashback_rate)}
                onChange={(e) => setRates((s) => ({ ...s, [p.slug]: e.target.value }))}
                className="mono w-24 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                placeholder="% hoàn"
              />
              <input
                defaultValue={p.affiliate_value ?? ""}
                onChange={(e) => setAffiliates((s) => ({ ...s, [p.slug]: e.target.value }))}
                className="mono min-w-[160px] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                placeholder={`Mã tiếp thị (${p.affiliate_param ?? "—"})`}
              />
              <button
                onClick={() => void savePlatform(p.slug)}
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Lưu
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
