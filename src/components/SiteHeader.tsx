import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useIsAdmin } from "@/lib/useSession";

export function SiteHeader() {
  const { user, loading } = useSession();
  const isAdmin = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-2 px-4 py-3 sm:mx-0 sm:px-6">
      <Link to="/" className="glass flex items-center gap-2 rounded-full px-3 py-2">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          HT
        </span>
        <span className="text-sm font-bold tracking-tight">HoànTiền</span>
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        {user ? (
          <>
            <Link
              to="/dashboard"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Tổng quan
            </Link>
            <Link
              to="/links"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Link của tôi
            </Link>
            <Link
              to="/withdraw"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Rút tiền
            </Link>
            {isAdmin ? (
              <Link
                to="/admin"
                className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Quản trị
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <a
              href="/#cach-hoat-dong"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cách hoạt động
            </a>
            <a
              href="/#san"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Sàn
            </a>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        {loading ? null : user ? (
          <>
            <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-semibold"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link
              to="/auth"
              className="hidden rounded-full px-3 py-2 text-sm font-medium hover:text-foreground sm:inline"
            >
              Đăng nhập
            </Link>
            <Link
              to="/auth"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
            >
              Bắt đầu
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
