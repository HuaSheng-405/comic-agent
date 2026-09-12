import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "./styles/index.css";

import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { HomePage } from "./pages/HomePage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";

/** 背景宇宙装饰(样式见 index.css):
 *  星点全局可见;UFO/火箭只在"侧边留白够宽"的窗口 + 非全宽页显示,
 *  工作台(/project/*)没有留白 → 由 body[data-page] 规则隐藏大件装饰。
 */
function DecorationLayer() {
  const { pathname } = useLocation();
  useEffect(() => {
    // 全宽页(工作台)与留白页(浏览页)的装饰策略不同,以 body 标记交给 CSS
    document.body.dataset.page = pathname.startsWith("/project/") ? "workbench" : "browse";
  }, [pathname]);
  return (
    <>
      <div className="deco-stars" aria-hidden="true" />
      <div className="ufo" aria-hidden="true">
        <div className="dome" />
        <div className="saucer" />
        <div className="rim" />
        <i className="light l0" />
        <i className="light l1" />
        <i className="light l2" />
        <i className="light l3" />
        <i className="light l4" />
        <div className="beam" />
      </div>
      <div className="rocket" aria-hidden="true">
        <div className="nose" />
        <div className="body" />
        <div className="window" />
        <div className="fin left" />
        <div className="fin right" />
        <div className="nozzle" />
        <div className="flame" />
      </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <DecorationLayer />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
