import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import {
  buildAffiliateUrl,
  detectPlatform,
  guessTitle,
  makeShortCode,
  PLATFORM_LABEL,
} from "@/lib/convert";
import { dong } from "@/lib/format";

type Result = {
  title: string;
  platform: string;
  affiliateUrl: string;
  shortCode: string;
  rate: number;
  saved: boolean;
};

export function usePlatforms() {
  return useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platforms")
        .select("*")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function LinkConverter() {
  const { user } = useSession();
  const { data: platforms } = usePlatforms();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function convert() {
    const raw = input.trim();
    if (!raw) return;
    const slug = detectPlatform(raw);
    if (!slug) {
      toast.error("Link không hợp lệ. Hãy dùng link từ Shopee, TikTok Shop, Lazada hoặc Tiki.");
      return;
    }
    const platform = platforms?.find((p) => p.slug === slug);
    const shortCode = makeShortCode();
    const affiliateUrl = buildAffiliateUrl(
      raw,
      platform?.affiliate_param ?? null,
      platform?.affiliate_value ?? null,
      shortCode,
    );
    const title = guessTitle(raw);
    setBusy(true);
    let saved = false;
    if (user) {
      const { error } = await supabase.from("links").insert({
        user_id: user.id,
        original_url: raw,
        affiliate_url: affiliateUrl,
        short_code: shortCode,
        platform: slug,
        title,
      });
      if (error) toast.error("Không lưu được link: " + error.message);
      else {
        saved = true;
        queryClient.invalidateQueries({ queryKey: ["links"] });
      }
    }
    setBusy(false);
    setResult({
      title,
      platform: PLATFORM_LABEL[slug],
      affiliateUrl,
      shortCode,
      rate: Number(platform?.cashback_rate ?? 0),
      saved,
    });
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.affiliateUrl);
    toast.success("Đã sao chép link");
  }

  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="pulse-dot size-2 rounded-full bg-emerald" />
        Dán link sản phẩm — hệ thống tự nhận diện sàn
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void convert();
          }}
          placeholder="https://shopee.vn/..."
          className="mono w-full flex-1 rounded-2xl border border-border bg-card/80 px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => void convert()}
          disabled={busy}
          className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Đang xử lý…" : "Chuyển link"}
        </button>
      </div>

      {result ? (
        <>
          <div className="rise mt-4 rounded-2xl border border-border bg-card/80 px-4 py-3">
            <p className="text-sm font-semibold capitalize">{result.title}</p>
            <p className="text-xs text-muted-foreground">
              {result.platform} · hoàn {result.rate}% · ví dụ đơn {dong(500000)} → hoàn{" "}
              {dong((500000 * result.rate) / 100)}
            </p>
          </div>
          <div className="rise mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald/20 bg-emerald/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald">
                Link tiếp thị đã sẵn sàng
              </p>
              <p className="mono max-w-[280px] truncate text-xs sm:max-w-md">
                {result.affiliateUrl}
              </p>
            </div>
            <button
              onClick={() => void copy()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sao chép
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {result.saved
              ? "Đã lưu vào tài khoản của bạn. Mua qua link này để được ghi nhận hoàn tiền."
              : "Đăng nhập để lưu link và theo dõi tiền hoàn về ví."}
          </p>
        </>
      ) : null}
    </div>
  );
}
