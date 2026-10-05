import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { LinkConverter } from "@/components/LinkConverter";
import { shortDate } from "@/lib/format";
import { PLATFORM_LABEL, type PlatformSlug } from "@/lib/convert";

export const Route = createFileRoute("/_authenticated/links")({
  head: () => ({
    meta: [
      { title: "Link của tôi — HoànTiền" },
      { name: "description", content: "Tất cả link tiếp thị bạn đã tạo và trạng thái của chúng." },
      { property: "og:title", content: "Link của tôi — HoànTiền" },
      { property: "og:description", content: "Quản lý link tiếp thị đã chuyển đổi." },
    ],
  }),
  component: LinksPage,
});

function LinksPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const links = useQuery({
    queryKey: ["links", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã xoá link");
      queryClient.invalidateQueries({ queryKey: ["links"] });
    }
  }

  return (
    <div className="py-6 lg:py-10">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Link của tôi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Chuyển link mới và xem lại toàn bộ link đã tạo.
      </p>

      <div className="mt-5">
        <LinkConverter />
      </div>

      <div className="glass mt-4 rounded-3xl p-5">
        <h2 className="text-sm font-bold">Lịch sử link</h2>
        {links.data && links.data.length > 0 ? (
          <div className="mt-3 space-y-2">
            {links.data.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold capitalize">{l.title}</p>
                  <p className="mono truncate text-[11px] text-muted-foreground">
                    {l.affiliate_url}
                  </p>
                </div>
                <span className="mono text-xs text-muted-foreground">
                  {PLATFORM_LABEL[l.platform as PlatformSlug] ?? l.platform}
                </span>
                <span className="mono text-xs text-muted-foreground">
                  {shortDate(l.created_at)}
                </span>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(l.affiliate_url);
                    toast.success("Đã sao chép");
                  }}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Sao chép
                </button>
                <button
                  onClick={() => void remove(l.id)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Bạn chưa tạo link nào.</p>
        )}
      </div>
    </div>
  );
}
