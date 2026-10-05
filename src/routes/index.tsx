import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { LinkConverter, usePlatforms } from "@/components/LinkConverter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HoànTiền — Hoàn tiền khi mua sắm Shopee, TikTok, Lazada, Tiki" },
      {
        name: "description",
        content:
          "Dán link sản phẩm, nhận link tiếp thị và được hoàn tiền về ví sau mỗi đơn hàng. Miễn phí, minh bạch.",
      },
      {
        property: "og:title",
        content: "HoànTiền — Hoàn tiền khi mua sắm online",
      },
      {
        property: "og:description",
        content: "Dán link, mua hàng, nhận hoàn tiền từ Shopee, TikTok Shop, Lazada và Tiki.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    title: "Dán link sản phẩm",
    body: "Copy link từ app Shopee, TikTok Shop, Lazada hoặc Tiki rồi dán vào ô chuyển đổi.",
  },
  {
    title: "Mua qua link vừa tạo",
    body: "Mở link tiếp thị và đặt hàng như bình thường, giá không đổi.",
  },
  {
    title: "Nhận tiền về ví",
    body: "Khi sàn xác nhận đơn, hoa hồng được cộng vào ví và bạn rút về MoMo hoặc ngân hàng.",
  },
];

function Index() {
  const { data: platforms } = usePlatforms();

  return (
    <Shell>
      <section className="grid gap-6 py-8 lg:grid-cols-12 lg:gap-10 lg:py-14">
        <div className="lg:col-span-5">
          <div className="rise inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="pulse-dot size-2 rounded-full bg-emerald" />
            Hoàn tiền minh bạch cho người mua sắm Việt
          </div>
          <h1 className="rise mt-4 text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[1.05] tracking-tight text-balance">
            Dán link. Mua hàng. <span className="text-primary">Nhận hoàn.</span>
          </h1>
          <p className="rise mt-4 max-w-[38ch] text-base text-muted-foreground text-pretty">
            Chuyển link Shopee, TikTok Shop, Lazada, Tiki thành link tiếp thị — hoa hồng trả về ví
            của bạn.
          </p>
          <div className="rise mt-5 flex flex-wrap gap-2">
            {(platforms ?? []).map((p) => (
              <span
                key={p.slug}
                className="rounded-full bg-card/70 px-3 py-1.5 text-xs font-semibold"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7">
          <LinkConverter />
        </div>
      </section>

      <section id="san" className="py-4">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Nguồn hoàn tự động từ
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {(platforms ?? []).map((p) => (
            <div
              key={p.slug}
              className="glass-strong flex flex-col items-center gap-1 rounded-2xl px-2 py-3"
            >
              <span className="text-sm font-bold">{p.name}</span>
              <span className="text-[10px] text-muted-foreground">đến {p.cashback_rate}%</span>
            </div>
          ))}
        </div>
      </section>

      <section id="cach-hoat-dong" className="py-10 lg:py-14">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Cách hoạt động</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="glass rounded-3xl p-5">
              <span className="mono text-xs text-primary">0{i + 1}</span>
              <p className="mt-2 text-base font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="glass mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">
            Tạo tài khoản miễn phí để theo dõi ví hoàn tiền của bạn.
          </p>
          <Link
            to="/auth"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </section>
    </Shell>
  );
}
