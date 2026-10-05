import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { LinkConverter } from "@/components/LinkConverter";
import { dong, shortDate } from "@/lib/format";
import { PLATFORM_LABEL, type PlatformSlug } from "@/lib/convert";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tổng quan ví hoàn tiền — HoànTiền" },
      { name: "description", content: "Số dư, hoa hồng chờ xác nhận và đơn hàng gần đây." },
      { property: "og:title", content: "Tổng quan ví hoàn tiền — HoànTiền" },
      { property: "og:description", content: "Theo dõi tiền hoàn của bạn theo thời gian thực." },
    ],
  }),
  component: Dashboard,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Đang chờ",
  confirmed: "Đã xác nhận",
  rejected: "Từ chối",
  paid: "Đã trả",
};

function Dashboard() {
  const { user } = useSession();

  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("wallet_summary", { _user_id: user!.id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const orders = useQuery({
    queryKey: ["orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="py-6 lg:py-10">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Bảng điều khiển hoàn tiền</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Số dư cập nhật khi đơn hàng được sàn xác nhận.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-medium text-muted-foreground">Số dư khả dụng</p>
            <p className="mt-1 text-[clamp(1.8rem,7vw,2.6rem)] font-extrabold tracking-tight">
              {dong(wallet.data?.available ?? 0)}
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                to="/withdraw"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Yêu cầu rút
              </Link>
              <Link
                to="/links"
                className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-semibold"
              >
                Link của tôi
              </Link>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đang chờ xác nhận</span>
                <span className="mono font-semibold text-amber">
                  {dong(wallet.data?.pending ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đã xác nhận</span>
                <span className="mono font-semibold text-emerald">
                  {dong(wallet.data?.confirmed ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đang chờ rút</span>
                <span className="mono font-semibold">{dong(wallet.data?.locked ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đã rút</span>
                <span className="mono font-semibold">{dong(wallet.data?.withdrawn ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <LinkConverter />
        </div>
      </div>

      <div className="glass mt-4 rounded-3xl p-5">
        <h2 className="text-sm font-bold">Đơn hàng gần đây</h2>
        {orders.data && orders.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Sản phẩm</th>
                  <th className="py-2 font-medium">Sàn</th>
                  <th className="py-2 font-medium">Hoa hồng</th>
                  <th className="py-2 font-medium">Trạng thái</th>
                  <th className="py-2 font-medium">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.data.map((o) => (
                  <tr key={o.id}>
                    <td className="max-w-[220px] truncate py-3">{o.product_name}</td>
                    <td className="mono text-xs">
                      {PLATFORM_LABEL[o.platform as PlatformSlug] ?? o.platform}
                    </td>
                    <td className="mono font-semibold">+{dong(o.commission)}</td>
                    <td>
                      <span
                        className={
                          o.status === "pending"
                            ? "rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-medium text-amber"
                            : o.status === "rejected"
                              ? "rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive"
                              : "rounded-full bg-emerald/15 px-2 py-0.5 text-[11px] font-medium text-emerald"
                        }
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="mono text-xs text-muted-foreground">
                      {shortDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa có đơn hàng nào. Hãy chuyển một link và mua sắm qua link đó.
          </p>
        )}
      </div>
    </div>
  );
}
