import { clsx } from "clsx";
import { Link, NavLink } from "react-router-dom";

/** 顶部导航栏:logo/导航/设置 */
export function TopBar({ projectId }: { projectId?: number }) {
  return (
    <header className="flex items-center gap-2 border-b border-white/10 bg-space-900/60 px-3 py-2 backdrop-blur">
      <Link to="/" className="font-comic text-lg font-semibold tracking-wide text-star">
        comic-agent
      </Link>
      {projectId != null && (
        <>
          <span className="text-white/20">/</span>
          <Link to={`/project/${projectId}`} className="truncate text-sm font-bold text-cream/90">
            工作台 #{projectId}
          </Link>
        </>
      )}

      <nav className="ml-2 flex items-center gap-1 border-l border-white/10 pl-2" aria-label="主导航">
        <NavItem to="/" end label="创作台" />
        <NavItem to="/projects" label="项目" />
      </nav>

      <div className="min-w-0 flex-1" />
      <Link
        to="/settings"
        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-cream/90 transition hover:bg-white/15"
        title="设置"
      >
        ⚙️ 设置
      </Link>
    </header>
  );
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          "rounded-full px-3 py-1.5 text-sm font-bold transition",
          isActive
            ? "bg-star/90 text-space-900"
            : "text-cream/80 hover:bg-white/10 hover:text-cream",
        )
      }
    >
      {label}
    </NavLink>
  );
}
