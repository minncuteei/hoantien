import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { dong, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({
    meta: [
      { title: "Rút tiền — HoànTiền" },
      { name: "description", content: "Gửi yêu cầu rút tiền hoàn về MoMo hoặc ngân hàng." },
      { property: "og:title", content: "Rút tiền — HoànTiền" },
      { property: "og:description", content: "Rút số dư hoàn tiền về tài khoản của bạn." },
    ],
  }),
  component: WithdrawPage,
});

const MIN = 50000;

const STATUS_LABEL: Record<string, string> = {
  pending: "Đang xử lý",
  approved: "Đã chuyển",
  rejected: "Từ chối",
};

function WithdrawPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("momo");
  const [account, setAccount] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);

  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("wallet_summary", { _user_id: user!.id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const history = useQuery({
    queryKey: ["withdrawals", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const available = Number(wallet.data?.available ?? 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < MIN) {
      toast.error(`Số tiền rút tối thiểu là ${dong(MIN)}.`);
      return;
    }
    if (value > available) {
      toast.error("Số dư khả dụng không đủ.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user!.id,
      amount: value,
      method,
      account,
      holder,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã gửi yêu cầu rút tiền.");
    setAmount("");
    queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
  }

  return (
    <div className="py-6 lg:py-10">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Rút tiền</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Số dư khả dụng: <span className="mono font-semibold">{dong(available)}</span> · tối thiểu{" "}
        {dong(MIN)}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-12">
        <form onSubmit={submit} className="glass space-y-3 rounded-3xl p-5 lg:col-span-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Số tiền</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="200000"
              className="mono mt-1 w-full rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Hình thức</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="momo">Ví MoMo</option>
              <option value="bank">Chuyển khoản ngân hàng</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {method === "momo" ? "Số điện thoại MoMo" : "Số tài khoản & ngân hàng"}
            </label>
            <input
              required
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={method === "momo" ? "0901234567" : "0123456789 - Vietcombank"}
              className="mt-1 w-full rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tên chủ tài khoản</label>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="NGUYEN VAN A"
              className="mt-1 w-full rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Đang gửi…" : "Gửi yêu cầu rút"}
          </button>
          <p className="text-xs text-muted-foreground">
            Yêu cầu được xử lý trong 24 giờ làm việc, miễn phí.
          </p>
        </form>

        <div className="glass rounded-3xl p-5 lg:col-span-7">
          <h2 className="text-sm font-bold">Lịch sử rút tiền</h2>
          {history.data && history.data.length > 0 ? (
            <div className="mt-3 space-y-2">
              {history.data.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3"
                >
                  <div>
                    <p className="mono text-sm font-semibold">{dong(w.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.method === "momo" ? "MoMo" : "Ngân hàng"} · {w.account} ·{" "}
                      {shortDate(w.created_at)}
                    </p>
                  </div>
                  <span
                    className={
                      w.status === "pending"
                        ? "rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-medium text-amber"
                        : w.status === "rejected"
                          ? "rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive"
                          : "rounded-full bg-emerald/15 px-2 py-0.5 text-[11px] font-medium text-emerald"
                    }
                  >
                    {STATUS_LABEL[w.status] ?? w.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Chưa có yêu cầu rút nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
