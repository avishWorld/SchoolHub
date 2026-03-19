#!/usr/bin/env node
/**
 * SchoolHub Dev Dashboard Generator
 *
 * Reads sprint markdown files → generates a live HTML dashboard.
 * Run: node tools/generate-dashboard.mjs
 * Or:  npm run dashboard
 *
 * Sources:
 *   - docs/sprints/sprint_XX/todo/sprint_XX_todo.md → task statuses
 *   - docs/sprints/sprint_XX/sprint_XX_index.md → sprint meta
 *   - docs/sprints/sprint_XX/reports/*.md → reports
 *   - docs/sprints/sprint_XX/reviews/*.md → CTO reviews
 *   - docs/PRD.md → version
 *   - docs/DECISIONS.md → decision count
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.argv[2] || ".");
const OUT = path.join(ROOT, "dev-dashboard.html");

// ─────────────────────────────────────────
// 1. Parse sprint todo markdown
// ─────────────────────────────────────────
function parseTodoFile(filepath) {
  if (!fs.existsSync(filepath)) return { dev: [], qa: [] };
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  const dev = [];
  const qa = [];
  let section = null;

  for (const line of lines) {
    if (line.includes("## Dev TODO")) { section = "dev"; continue; }
    if (line.includes("## QA TODO")) { section = "qa"; continue; }
    if (line.startsWith("## ") && !line.includes("TODO")) { section = null; continue; }
    if (!section || !line.startsWith("|")) continue;
    if (line.includes("---") || line.includes("Task") || line.includes("Test Scenario")) continue;

    const cells = line.split("|").map(c => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    if (section === "dev" && cells.length >= 5) {
      const statusRaw = cells[4];
      let status = "pending";
      if (statusRaw.includes("[x]")) status = "done";
      else if (statusRaw.includes("[~]")) status = "progress";
      else if (statusRaw.includes("[!]")) status = "blocked";

      dev.push({
        id: cells[0],
        task: cells[1],
        owner: cells[2],
        size: cells[3],
        status,
        ac: cells[5] || "",
      });
    }

    if (section === "qa") {
      const statusRaw = cells[4] || cells[3];
      let status = "pending";
      if (statusRaw.includes("[x]")) status = "done";
      else if (statusRaw.includes("[~]")) status = "progress";

      qa.push({
        id: cells[0],
        task: cells[1],
        type: cells[2],
        framework: cells[3],
        status,
        expected: cells[5] || "",
      });
    }
  }
  return { dev, qa };
}

// ─────────────────────────────────────────
// 2. Parse sprint index
// ─────────────────────────────────────────
function parseSprintIndex(filepath) {
  if (!fs.existsSync(filepath)) return { goal: "", status: "", start: "", end: "", prd: "" };
  const content = fs.readFileSync(filepath, "utf-8");
  const goal = content.match(/\*\*Goal\*\*\s*\|\s*(.+)/)?.[1] || "";
  const status = content.match(/\*\*Status\*\*\s*\|\s*(.+)/)?.[1] || "Unknown";
  const start = content.match(/\*\*Start\*\*\s*\|\s*(.+)/)?.[1] || "";
  const end = content.match(/\*\*End\*\*\s*\|\s*(.+)/)?.[1] || "";
  const prd = content.match(/\*\*PRD Version\*\*\s*\|\s*(.+)/)?.[1] || "";
  return { goal, status, start, end, prd };
}

// ─────────────────────────────────────────
// 3. Count decisions
// ─────────────────────────────────────────
function countDecisions(filepath) {
  if (!fs.existsSync(filepath)) return 0;
  const content = fs.readFileSync(filepath, "utf-8");
  return (content.match(/^## Decision \d+/gm) || []).length;
}

// ─────────────────────────────────────────
// 4. Find reviews
// ─────────────────────────────────────────
function findReviews(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".md") && f !== ".gitkeep")
    .map(f => {
      const content = fs.readFileSync(path.join(dir, f), "utf-8");
      const verdict = content.includes("APPROVE") ? "approve" : content.includes("REVISE") ? "revise" : "pending";
      const title = content.match(/^#\s+(.+)/m)?.[1] || f;
      const date = content.match(/\*\*Date:\*\*\s*(.+)/)?.[1] || "";
      const goodCount = (content.match(/^\d+\.\s+\*\*/gm) || []).length;
      return { file: f, title, date, verdict, goodCount };
    });
}

// ─────────────────────────────────────────
// 5. Detect current sprint
// ─────────────────────────────────────────
function findCurrentSprint() {
  const sprintsDir = path.join(ROOT, "docs/sprints");
  if (!fs.existsSync(sprintsDir)) return null;
  const dirs = fs.readdirSync(sprintsDir)
    .filter(d => d.startsWith("sprint_") && fs.statSync(path.join(sprintsDir, d)).isDirectory())
    .sort();
  return dirs[dirs.length - 1] || null;
}

// ─────────────────────────────────────────
// 6. Determine next agent action
// ─────────────────────────────────────────
function determineAgentStates(devTasks, qaTasks) {
  const done = devTasks.filter(t => t.status === "done");
  const progress = devTasks.filter(t => t.status === "progress");
  const nextDev = devTasks.find(t => t.status === "pending" || t.status === "progress");
  const nextQa = qaTasks.find(t => t.status === "pending");
  const allDevDone = done.length === devTasks.length;
  const qaDone = qaTasks.filter(t => t.status === "done");

  // Determine if CTO review is needed (every 2-5 tasks completed since last review)
  const needsReview = done.length > 0 && done.length % 5 === 0 && progress.length === 0;

  return {
    cto: {
      status: needsReview ? "review-needed" : "idle",
      label: needsReview ? "⚠ Review Needed" : "✓ Idle",
      color: needsReview ? "amber" : "green",
      next: needsReview ? `Review D${String(done.length - 4).padStart(2,"0")}-D${String(done.length).padStart(2,"0")}` : `Review after next batch`,
    },
    dev: {
      status: allDevDone ? "done" : nextDev ? "active" : "idle",
      label: allDevDone ? "✓ All Done" : nextDev ? "● Active" : "Idle",
      color: allDevDone ? "green" : "blue",
      next: nextDev ? `${nextDev.id} ${nextDev.task}` : "All dev tasks complete",
      nextId: nextDev?.id || "",
    },
    qa: {
      status: allDevDone && qaDone.length < qaTasks.length ? "active" : qaDone.length === qaTasks.length ? "done" : "waiting",
      label: qaDone.length === qaTasks.length ? "✓ All Passed" : allDevDone ? "● Active" : "⏳ Waiting",
      color: qaDone.length === qaTasks.length ? "green" : allDevDone ? "blue" : "text-dim",
      next: nextQa ? `${nextQa.id} ${nextQa.task}` : "All QA complete",
    },
  };
}

// ─────────────────────────────────────────
// 7. Build pipeline steps
// ─────────────────────────────────────────
function buildPipeline(devTasks, reviews) {
  const done = devTasks.filter(t => t.status === "done").length;
  const total = devTasks.length;
  const hasApprovedReview = reviews.some(r => r.verdict === "approve");

  const steps = [
    { icon: "📋", label: "PRD", state: "done" },
    { icon: "🏛", label: "Architecture", state: "done" },
    { icon: "📊", label: "Sprint Plan", state: "done" },
  ];

  // Group tasks into phases
  const phases = [
    { ids: ["D01","D02","D03"], label: "Foundation", icon: "🛠" },
    { ids: ["D04","D05"], label: "PIN Auth", icon: "🔑" },
    { ids: ["D06","D07","D08","D09"], label: "Schedule", icon: "📅" },
    { ids: ["D10","D11"], label: "Parent", icon: "👨‍👩‍👧" },
    { ids: ["D12","D13"], label: "Teacher", icon: "👩‍🏫" },
    { ids: ["D14","D15","D16"], label: "Admin", icon: "⚙" },
    { ids: ["D17","D18","D19","D20","D21","D22"], label: "Enrollment", icon: "🔗" },
    { ids: ["D23"], label: "Seed Data", icon: "🌱" },
  ];

  for (const phase of phases) {
    const phaseTasks = devTasks.filter(t => phase.ids.includes(t.id));
    const phaseDone = phaseTasks.filter(t => t.status === "done").length;
    const phaseProgress = phaseTasks.some(t => t.status === "progress");
    let state = "pending";
    if (phaseDone === phaseTasks.length) state = "done";
    else if (phaseDone > 0 || phaseProgress) state = "active";
    else {
      // active if previous phase is done
      const prevPhase = steps[steps.length - 1];
      if (prevPhase && prevPhase.state === "done") state = "active";
    }
    steps.push({ icon: phase.icon, label: phase.label, state });
  }

  steps.push({ icon: "🧪", label: "QA", state: done === total ? "active" : "pending" });
  steps.push({ icon: "🚀", label: "Sprint Done", state: "pending" });

  return steps;
}

// ─────────────────────────────────────────
// 8. Collect project files for viewer
// ─────────────────────────────────────────
function collectFiles(root, sprint) {
  const files = {};
  const filePaths = [
    "docs/PRD.md",
    "docs/ARCHITECTURE.md",
    "docs/DECISIONS.md",
    "CLAUDE.md",
    "AGENTS.md",
    `docs/sprints/${sprint}/${sprint}_index.md`,
    `docs/sprints/${sprint}/todo/${sprint}_todo.md`,
    `docs/sprints/${sprint}/reports/${sprint}_report.md`,
    ".claude/commands/cto.md",
    ".claude/commands/dev.md",
    ".claude/commands/qa.md",
    "supabase/migrations/001_initial_schema.sql",
    "supabase/seed.sql",
    "src/types/database.ts",
    "src/lib/supabase.ts",
    "src/lib/utils.ts",
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/globals.css",
    "src/components/ui/button.tsx",
    "src/components/ui/input.tsx",
    "src/components/ui/card.tsx",
    "package.json",
    "tailwind.config.ts",
    "vitest.config.ts",
    "tsconfig.json",
    ".env.example",
  ];

  // Also add any review files dynamically
  const reviewDir = path.join(root, `docs/sprints/${sprint}/reviews`);
  if (fs.existsSync(reviewDir)) {
    fs.readdirSync(reviewDir).filter(f => f.endsWith(".md")).forEach(f => {
      filePaths.push(`docs/sprints/${sprint}/reviews/${f}`);
    });
  }

  for (const fp of filePaths) {
    const fullPath = path.join(root, fp);
    if (fs.existsSync(fullPath)) {
      try {
        files[fp] = fs.readFileSync(fullPath, "utf-8");
      } catch { /* skip binary/unreadable */ }
    }
  }
  return files;
}

// ─────────────────────────────────────────
// 9. Generate HTML
// ─────────────────────────────────────────
function generateHTML(data) {
  const { sprint, sprintMeta, devTasks, qaTasks, agents, pipeline, reviews, decisionCount, today, files } = data;
  const devDone = devTasks.filter(t => t.status === "done").length;
  const qaDone = qaTasks.filter(t => t.status === "done").length;
  const devTotal = devTasks.length;
  const qaTotal = qaTasks.length;
  const pct = devTotal > 0 ? Math.round((devDone / devTotal) * 100) : 0;
  const circumference = 2 * Math.PI * 26; // r=26
  const offset = circumference - (pct / 100) * circumference;
  const sprintNum = sprint.replace("sprint_", "");

  // Task cards
  const doneTasks = devTasks.filter(t => t.status === "done");
  const activeTasks = devTasks.filter(t => t.status === "progress");
  const nextTasks = devTasks.filter(t => t.status === "pending").slice(0, 2);
  const pendingTasks = devTasks.filter(t => t.status === "pending").slice(2);

  function taskCard(t) {
    const idClass = t.status === "done" ? "id-done" : t.status === "progress" ? "id-progress" : "id-pending";
    return `<div class="task-card"><div class="task-id-small ${idClass}">${t.id}</div><div class="task-title">${t.task}</div><div class="task-meta"><span class="size-badge size-${t.size}">${t.size}</span> ${t.owner}</div></div>`;
  }

  function devRow(t) {
    const idClass = t.status === "done" ? "id-done" : t.status === "progress" ? "id-progress" : "id-pending";
    const statusMap = { done: '<span style="color:var(--green);font-family:var(--mono);font-weight:600;">✓ Done</span>', progress: '<span style="color:var(--blue);font-family:var(--mono);font-weight:600;">● Active</span>', pending: '<span style="color:var(--text-muted);font-family:var(--mono);">○ Pending</span>', blocked: '<span style="color:var(--red);font-family:var(--mono);font-weight:600;">! Blocked</span>' };
    return `<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;font-family:var(--mono);font-weight:600;" class="${idClass}">${t.id}</td><td style="padding:8px;">${t.task}</td><td style="padding:8px;font-size:12px;color:var(--text-dim);">${t.owner}</td><td style="padding:8px;"><span class="size-badge size-${t.size}">${t.size}</span></td><td style="padding:8px;">${statusMap[t.status] || statusMap.pending}</td></tr>`;
  }

  function qaRow(t) {
    const typeColor = t.type === "E2E" ? "var(--purple)" : "var(--cyan)";
    const statusMap = { done: '<span style="color:var(--green);font-family:var(--mono);">✓ Done</span>', progress: '<span style="color:var(--blue);font-family:var(--mono);">● Active</span>', pending: '<span style="color:var(--text-muted);font-family:var(--mono);">○ Pending</span>' };
    return `<tr style="border-bottom:1px solid var(--border);"><td style="padding:8px;font-family:var(--mono);font-weight:600;color:var(--cyan);">${t.id}</td><td style="padding:8px;">${t.task}</td><td style="padding:8px;font-size:12px;color:${typeColor};">${t.type}</td><td style="padding:8px;">${statusMap[t.status] || statusMap.pending}</td></tr>`;
  }

  function pipelineStep(s, i, arr) {
    const arrow = i < arr.length - 1 ? `<div class="pipeline-arrow ${s.state === 'done' ? 'done' : ''}">\u2190</div>` : "";
    return `<div class="pipeline-step ${s.state}"><div class="step-icon">${s.icon}</div><div class="step-label">${s.label}</div></div>${arrow}`;
  }

  function reviewCard(r) {
    const verdictClass = r.verdict === "approve" ? "verdict-approve" : "verdict-revise";
    const verdictLabel = r.verdict === "approve" ? "✓ APPROVED" : r.verdict === "revise" ? "⚠ REVISE" : "⏳ PENDING";
    return `<div class="review-card"><div class="review-header"><div><div style="font-size:16px;font-weight:600;">${r.title}</div><div style="font-size:12px;color:var(--text-dim);margin-top:4px;">${r.date} · ${r.file}</div></div><span class="review-verdict ${verdictClass}">${verdictLabel}</span></div></div>`;
  }

  const agentColors = { green: "var(--green)", blue: "var(--blue)", amber: "var(--amber)", "text-dim": "var(--text-dim)" };

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SchoolHub — Dev Dashboard</title>
<meta http-equiv="refresh" content="30">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#0c0e14;--bg-card:#141722;--bg-card-hover:#1a1e2e;--bg-accent:#1e2235;--border:#2a2e42;--border-active:#4f6df5;--text:#e2e4ea;--text-dim:#7a7f96;--text-muted:#4e5268;--blue:#4f6df5;--blue-dim:#2d3a7a;--green:#34d399;--green-dim:#0d3d2e;--amber:#fbbf24;--amber-dim:#3d3010;--red:#f87171;--red-dim:#3d1515;--purple:#a78bfa;--cyan:#22d3ee;--font:'IBM Plex Sans Hebrew','Arial',sans-serif;--mono:'JetBrains Mono',monospace;--radius:12px}*{margin:0;padding:0;box-sizing:border-box}body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}.topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 32px;border-bottom:1px solid var(--border);background:var(--bg-card);position:sticky;top:0;z-index:100}.topbar-title{display:flex;align-items:center;gap:12px}.topbar-title h1{font-size:18px;font-weight:600;letter-spacing:-0.02em}.topbar-title .badge{font-size:11px;font-family:var(--mono);padding:3px 8px;border-radius:6px;background:var(--blue-dim);color:var(--blue);font-weight:500}.topbar-meta{display:flex;align-items:center;gap:20px;font-size:13px;color:var(--text-dim)}.topbar-meta .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-left:6px}.dot-green{background:var(--green);box-shadow:0 0 8px var(--green)}.dot-amber{background:var(--amber);box-shadow:0 0 8px var(--amber)}.layout{display:grid;grid-template-columns:280px 1fr;min-height:calc(100vh - 57px)}.sidebar{border-left:1px solid var(--border);padding:24px 16px;background:var(--bg-card);overflow-y:auto}.sidebar h3{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:12px;padding:0 8px}.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:14px;color:var(--text-dim);transition:all 0.15s;margin-bottom:2px}.nav-item:hover{background:var(--bg-accent);color:var(--text)}.nav-item.active{background:var(--blue-dim);color:var(--blue);font-weight:500}.nav-item .icon{font-size:16px;width:20px;text-align:center}.nav-item .count{margin-right:auto;font-size:11px;font-family:var(--mono);background:var(--bg-accent);padding:2px 6px;border-radius:4px}.nav-divider{height:1px;background:var(--border);margin:16px 0}.main{padding:28px 32px;overflow-y:auto}.sprint-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px}.sprint-header h2{font-size:24px;font-weight:600;letter-spacing:-0.02em}.sprint-header .subtitle{font-size:14px;color:var(--text-dim);margin-top:4px}.progress-ring{display:flex;align-items:center;gap:16px}.ring-container{position:relative;width:64px;height:64px}.ring-container svg{transform:rotate(-90deg)}.ring-container .ring-bg{stroke:var(--border)}.ring-container .ring-fill{stroke:var(--green);stroke-linecap:round;transition:stroke-dashoffset 0.8s ease}.ring-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;font-family:var(--mono)}.ring-text{text-align:left}.ring-text .big{font-size:14px;font-weight:600}.ring-text .small{font-size:12px;color:var(--text-dim)}.pipeline{display:flex;align-items:center;gap:0;margin-bottom:32px;padding:20px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);overflow-x:auto}.pipeline-step{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:80px;position:relative}.pipeline-step .step-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid var(--border);background:var(--bg);transition:all 0.3s}.pipeline-step.done .step-icon{border-color:var(--green);background:var(--green-dim)}.pipeline-step.active .step-icon{border-color:var(--blue);background:var(--blue-dim);box-shadow:0 0 16px rgba(79,109,245,0.3);animation:pulse-glow 2s infinite}.pipeline-step.pending .step-icon{border-color:var(--border);opacity:0.5}.pipeline-step .step-label{font-size:10px;font-weight:500;color:var(--text-dim);text-align:center;max-width:70px}.pipeline-step.active .step-label{color:var(--blue);font-weight:600}.pipeline-step.done .step-label{color:var(--green)}.pipeline-arrow{font-size:16px;color:var(--text-muted);margin:0 2px;margin-bottom:20px}.pipeline-arrow.done{color:var(--green)}@keyframes pulse-glow{0%,100%{box-shadow:0 0 8px rgba(79,109,245,0.2)}50%{box-shadow:0 0 20px rgba(79,109,245,0.5)}}.agents-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}.agent-card{padding:20px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-card);transition:all 0.2s}.agent-card:hover{border-color:var(--border-active);transform:translateY(-2px)}.agent-card.active-agent{border-color:var(--blue);background:linear-gradient(135deg,var(--bg-card),var(--blue-dim))}.agent-card .agent-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.agent-card .agent-name{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}.agent-tag{font-size:10px;font-family:var(--mono);padding:2px 8px;border-radius:4px;font-weight:600}.tag-cto{background:var(--purple);color:#000}.tag-dev{background:var(--blue);color:#fff}.tag-qa{background:var(--green);color:#000}.agent-card .next-task{font-size:13px;margin-top:8px;padding:8px 10px;background:var(--bg);border-radius:8px;border:1px solid var(--border);font-family:var(--mono);font-size:12px}.task-board{margin-bottom:32px}.task-board h3{font-size:16px;font-weight:600;margin-bottom:16px}.board-columns{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.board-col{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px;min-height:200px}.board-col-header{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-dim);padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}.board-col-header .col-count{background:var(--bg-accent);padding:2px 8px;border-radius:10px;font-family:var(--mono);font-size:11px}.task-card{padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;font-size:12px;transition:all 0.15s}.task-card:hover{border-color:var(--blue);transform:translateX(-2px)}.task-card .task-id-small{font-family:var(--mono);font-weight:600;font-size:11px;margin-bottom:4px}.task-card .task-title{color:var(--text);line-height:1.4}.task-card .task-meta{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:10px;color:var(--text-muted)}.size-badge{font-family:var(--mono);padding:1px 5px;border-radius:3px;font-weight:600;font-size:10px}.size-S{background:var(--green-dim);color:var(--green)}.size-M{background:var(--amber-dim);color:var(--amber)}.size-L{background:var(--red-dim);color:var(--red)}.id-done{color:var(--green)}.id-progress{color:var(--blue)}.id-pending{color:var(--text-muted)}.id-qa{color:var(--cyan)}.docs-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:32px}.doc-card{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);transition:all 0.15s;color:var(--text)}.doc-card:hover{border-color:var(--blue);background:var(--bg-card-hover)}.doc-card .doc-icon{font-size:22px}.doc-card .doc-info{flex:1}.doc-card .doc-name{font-size:13px;font-weight:500}.doc-card .doc-path{font-size:11px;color:var(--text-muted);font-family:var(--mono)}.doc-card .doc-status{font-size:10px;padding:3px 8px;border-radius:4px;font-weight:500}.status-current{background:var(--green-dim);color:var(--green)}.status-updated{background:var(--blue-dim);color:var(--blue)}.review-card{padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px}.review-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.review-verdict{font-family:var(--mono);font-weight:700;font-size:12px;padding:4px 12px;border-radius:6px}.verdict-approve{background:var(--green-dim);color:var(--green)}.verdict-revise{background:var(--amber-dim);color:var(--amber)}.tab-content{display:none}.tab-content.visible{display:block}.gen-info{text-align:center;padding:16px;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border);font-family:var(--mono)}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}.board-columns{grid-template-columns:repeat(2,1fr)}.agents-row{grid-template-columns:1fr}}
/* File Viewer */
.viewer-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:none;backdrop-filter:blur(4px);animation:fadeIn 0.15s ease}
.viewer-overlay.open{display:flex;justify-content:center;align-items:center}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.viewer-panel{width:85vw;max-width:1000px;height:85vh;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.5)}
.viewer-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border);flex-shrink:0}
.viewer-header .viewer-path{font-family:var(--mono);font-size:13px;color:var(--blue)}
.viewer-header .viewer-close{background:none;border:1px solid var(--border);color:var(--text);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
.viewer-header .viewer-close:hover{background:var(--red-dim);border-color:var(--red);color:var(--red)}
.viewer-body{flex:1;overflow-y:auto;padding:24px;direction:ltr;text-align:left}
.viewer-body pre{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px;overflow-x:auto;font-family:var(--mono);font-size:13px;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;color:var(--text)}
.viewer-body .md-h1{font-size:24px;font-weight:700;color:var(--text);margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid var(--border)}
.viewer-body .md-h2{font-size:20px;font-weight:600;color:var(--blue);margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.viewer-body .md-h3{font-size:16px;font-weight:600;color:var(--purple);margin:16px 0 8px}
.viewer-body .md-h4{font-size:14px;font-weight:600;color:var(--cyan);margin:12px 0 6px}
.viewer-body .md-p{margin:8px 0;line-height:1.7;color:var(--text)}
.viewer-body .md-li{margin:4px 0;padding-right:8px;color:var(--text)}
.viewer-body .md-li::before{content:"•";color:var(--blue);margin-left:8px}
.viewer-body .md-strong{color:var(--amber);font-weight:600}
.viewer-body .md-code{background:var(--bg-accent);padding:2px 6px;border-radius:4px;font-family:var(--mono);font-size:12px;color:var(--cyan)}
.viewer-body .md-blockquote{border-right:3px solid var(--blue);padding:8px 16px;margin:12px 0;background:var(--bg-accent);border-radius:0 8px 8px 0;color:var(--text-dim);font-style:italic}
.viewer-body .md-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
.viewer-body .md-table th{background:var(--bg-accent);padding:8px 12px;text-align:left;font-weight:600;border:1px solid var(--border);color:var(--text)}
.viewer-body .md-table td{padding:8px 12px;border:1px solid var(--border);color:var(--text-dim)}
.viewer-body .md-table tr:hover td{background:var(--bg-accent)}
.viewer-body .md-hr{border:none;border-top:1px solid var(--border);margin:20px 0}
.viewer-body .md-cb{margin:12px 0}
.doc-card{cursor:pointer}
</style>
</head>
<body>
<div class="topbar">
  <div class="topbar-title"><h1>\u2B21 SchoolHub</h1><span class="badge">DEV DASHBOARD</span></div>
  <div class="topbar-meta">
    <span><span class="dot dot-green"></span> Sprint ${sprintNum}</span>
    <span>PRD ${sprintMeta.prd}</span>
    <span>${devDone}/${devTotal} Dev \xB7 ${qaDone}/${qaTotal} QA</span>
    <span>${today}</span>
  </div>
</div>
<div class="layout">
  <aside class="sidebar">
    <h3>\u05E0\u05D9\u05D5\u05D5\u05D8</h3>
    <div class="nav-item active" onclick="showTab('overview')"><span class="icon">\u25C9</span> \u05E1\u05E7\u05D9\u05E8\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA</div>
    <div class="nav-item" onclick="showTab('tasks')"><span class="icon">\u2630</span> \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA<span class="count">${devTotal}+${qaTotal}</span></div>
    <div class="nav-item" onclick="showTab('docs')"><span class="icon">\uD83D\uDCC4</span> \u05DE\u05E1\u05DE\u05DB\u05D9\u05DD</div>
    <div class="nav-item" onclick="showTab('reviews')"><span class="icon">\uD83D\uDD0D</span> \u05E1\u05E7\u05D9\u05E8\u05D5\u05EA CTO<span class="count">${reviews.length}</span></div>
    <div class="nav-divider"></div>
    <h3>Agents</h3>
    <div class="nav-item"><span class="icon">\uD83C\uDFD7</span> CTO<span class="count" style="color:${agentColors[agents.cto.color]}">${agents.cto.label}</span></div>
    <div class="nav-item"><span class="icon">\u2328</span> DEV<span class="count" style="color:${agentColors[agents.dev.color]}">${agents.dev.nextId || agents.dev.label}</span></div>
    <div class="nav-item"><span class="icon">\uD83E\uDDEA</span> QA<span class="count" style="color:${agentColors[agents.qa.color]}">${agents.qa.label}</span></div>
    <div class="nav-divider"></div>
    <h3>CLI Commands</h3>
    <div class="nav-item" style="font-size:12px;color:var(--text-muted);"><span class="icon">\u26A1</span><code style="font-family:var(--mono);font-size:11px;">/project:cto</code></div>
    <div class="nav-item" style="font-size:12px;color:var(--text-muted);"><span class="icon">\u26A1</span><code style="font-family:var(--mono);font-size:11px;">/project:dev</code></div>
    <div class="nav-item" style="font-size:12px;color:var(--text-muted);"><span class="icon">\u26A1</span><code style="font-family:var(--mono);font-size:11px;">/project:qa</code></div>
  </aside>
  <main class="main">
    <!-- Overview Tab -->
    <div id="tab-overview" class="tab-content visible">
      <div class="sprint-header">
        <div><h2>Sprint ${sprintNum} \u2014 ${sprintMeta.goal ? sprintMeta.goal.substring(0, 60) : "Foundation"}</h2><div class="subtitle">${sprintMeta.goal}</div></div>
        <div class="progress-ring">
          <div class="ring-container">
            <svg width="64" height="64" viewBox="0 0 64 64"><circle class="ring-bg" cx="32" cy="32" r="26" fill="none" stroke-width="5"/><circle class="ring-fill" cx="32" cy="32" r="26" fill="none" stroke-width="5" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/></svg>
            <div class="ring-label">${pct}%</div>
          </div>
          <div class="ring-text"><div class="big">${devDone} / ${devTotal} Dev</div><div class="small">${qaDone} / ${qaTotal} QA</div></div>
        </div>
      </div>
      <div class="pipeline">${pipeline.map((s, i, a) => pipelineStep(s, i, a)).join("")}</div>
      <div class="agents-row">
        <div class="agent-card ${agents.cto.status === 'review-needed' ? 'active-agent' : ''}">
          <div class="agent-header"><div class="agent-name"><span class="agent-tag tag-cto">CTO</span> \u05D0\u05D3\u05E8\u05D9\u05DB\u05DC</div><div style="color:${agentColors[agents.cto.color]};font-size:12px;">${agents.cto.label}</div></div>
          <div class="next-task">${agents.cto.next}</div>
        </div>
        <div class="agent-card ${agents.dev.status === 'active' ? 'active-agent' : ''}">
          <div class="agent-header"><div class="agent-name"><span class="agent-tag tag-dev">DEV</span> \u05DE\u05E4\u05EA\u05D7</div><div style="color:${agentColors[agents.dev.color]};font-size:12px;">${agents.dev.label}</div></div>
          <div class="next-task">${agents.dev.next}</div>
        </div>
        <div class="agent-card ${agents.qa.status === 'active' ? 'active-agent' : ''}">
          <div class="agent-header"><div class="agent-name"><span class="agent-tag tag-qa">QA</span> \u05D1\u05D5\u05D3\u05E7</div><div style="color:${agentColors[agents.qa.color]};font-size:12px;">${agents.qa.label}</div></div>
          <div class="next-task">${agents.qa.next}</div>
        </div>
      </div>
      <div class="task-board">
        <h3>\uD83D\uDCCB \u05DC\u05D5\u05D7 \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA</h3>
        <div class="board-columns">
          <div class="board-col"><div class="board-col-header"><span>\u2705 Done</span><span class="col-count">${doneTasks.length}</span></div>${doneTasks.map(taskCard).join("")}</div>
          <div class="board-col" style="border-color:var(--blue-dim);"><div class="board-col-header" style="color:var(--blue);"><span>\u2192 \u05D4\u05D1\u05D0</span><span class="col-count">${activeTasks.length + nextTasks.length}</span></div>${activeTasks.map(taskCard).join("")}${nextTasks.map(taskCard).join("")}</div>
          <div class="board-col"><div class="board-col-header"><span>\u23F3 Pending</span><span class="col-count">${pendingTasks.length}</span></div>${pendingTasks.slice(0, 5).map(taskCard).join("")}${pendingTasks.length > 5 ? `<div style="font-size:11px;color:var(--text-muted);padding:8px;">+${pendingTasks.length - 5} more...</div>` : ""}</div>
          <div class="board-col"><div class="board-col-header"><span>\uD83E\uDDEA QA</span><span class="col-count">${qaTotal}</span></div>${qaTasks.filter(t=>t.status==="done").slice(0,3).map(t => `<div class="task-card"><div class="task-id-small id-qa">${t.id}</div><div class="task-title">${t.task}</div></div>`).join("")}${qaTasks.filter(t=>t.status==="pending").slice(0,3).map(t => `<div class="task-card"><div class="task-id-small id-qa">${t.id}</div><div class="task-title">${t.task}</div></div>`).join("")}</div>
        </div>
      </div>
    </div>
    <!-- Tasks Tab -->
    <div id="tab-tasks" class="tab-content">
      <h2 style="margin-bottom:20px;">\u05DB\u05DC \u05D4\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u2014 Sprint ${sprintNum}</h2>
      <h3 style="margin-bottom:12px;color:var(--blue);">Dev Tasks (${devTotal})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px;">
        <thead><tr style="border-bottom:2px solid var(--border);text-align:right;"><th style="padding:8px;width:50px;">#</th><th style="padding:8px;">Task</th><th style="padding:8px;width:100px;">Owner</th><th style="padding:8px;width:50px;">Size</th><th style="padding:8px;width:80px;">Status</th></tr></thead>
        <tbody>${devTasks.map(devRow).join("")}</tbody>
      </table>
      <h3 style="margin-bottom:12px;color:var(--cyan);">QA Tasks (${qaTotal})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="border-bottom:2px solid var(--border);text-align:right;"><th style="padding:8px;width:50px;">#</th><th style="padding:8px;">Test Scenario</th><th style="padding:8px;width:80px;">Type</th><th style="padding:8px;width:80px;">Status</th></tr></thead>
        <tbody>${qaTasks.map(qaRow).join("")}</tbody>
      </table>
    </div>
    <!-- Docs Tab -->
    <div id="tab-docs" class="tab-content">
      <h2 style="margin-bottom:20px;">\u05DE\u05E1\u05DE\u05DB\u05D9 \u05E4\u05E8\u05D5\u05D9\u05E7\u05D8</h2>
      <p style="font-size:13px;color:var(--text-dim);margin-bottom:16px;">\u05DC\u05D7\u05E5 \u05E2\u05DC \u05DE\u05E1\u05DE\u05DA \u05DB\u05D3\u05D9 \u05DC\u05E7\u05E8\u05D5\u05D0 \u05D0\u05D5\u05EA\u05D5</p>
      <h3 style="margin-bottom:12px;color:var(--text-dim);font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">\u05DE\u05E1\u05DE\u05DB\u05D9 \u05EA\u05DB\u05E0\u05D5\u05DF</h3>
      <div class="docs-grid">
        <div class="doc-card" onclick="openFile('docs/PRD.md')"><div class="doc-icon">\uD83D\uDCD8</div><div class="doc-info"><div class="doc-name">PRD</div><div class="doc-path">docs/PRD.md</div></div><span class="doc-status status-current">${sprintMeta.prd}</span></div>
        <div class="doc-card" onclick="openFile('docs/ARCHITECTURE.md')"><div class="doc-icon">\uD83C\uDFDB</div><div class="doc-info"><div class="doc-name">ARCHITECTURE</div><div class="doc-path">docs/ARCHITECTURE.md</div></div><span class="doc-status status-updated">Updated</span></div>
        <div class="doc-card" onclick="openFile('docs/DECISIONS.md')"><div class="doc-icon">\u2696</div><div class="doc-info"><div class="doc-name">DECISIONS</div><div class="doc-path">docs/DECISIONS.md</div></div><span class="doc-status status-updated">${decisionCount} ADRs</span></div>
        <div class="doc-card" onclick="openFile('CLAUDE.md')"><div class="doc-icon">\uD83E\uDD16</div><div class="doc-info"><div class="doc-name">CLAUDE.md</div><div class="doc-path">CLAUDE.md</div></div><span class="doc-status status-current">Current</span></div>
      </div>
      <h3 style="margin:20px 0 12px;color:var(--text-dim);font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Sprint</h3>
      <div class="docs-grid">
        <div class="doc-card" onclick="openFile('docs/sprints/${sprint}/${sprint}_index.md')"><div class="doc-icon">\uD83C\uDFAF</div><div class="doc-info"><div class="doc-name">Sprint Index</div><div class="doc-path">docs/sprints/${sprint}/${sprint}_index.md</div></div></div>
        <div class="doc-card" onclick="openFile('docs/sprints/${sprint}/todo/${sprint}_todo.md')"><div class="doc-icon">\u2705</div><div class="doc-info"><div class="doc-name">Sprint Todo</div><div class="doc-path">docs/sprints/${sprint}/todo/${sprint}_todo.md</div></div><span class="doc-status status-updated">${devDone}/${devTotal}</span></div>
        <div class="doc-card" onclick="openFile('docs/sprints/${sprint}/reports/${sprint}_report.md')"><div class="doc-icon">\uD83D\uDCCA</div><div class="doc-info"><div class="doc-name">Sprint Report</div><div class="doc-path">docs/sprints/${sprint}/reports/${sprint}_report.md</div></div></div>
        ${reviews.map(r => `<div class="doc-card" onclick="openFile('docs/sprints/${sprint}/reviews/${r.file}')"><div class="doc-icon">\uD83D\uDD0D</div><div class="doc-info"><div class="doc-name">${r.title.substring(0,40)}</div><div class="doc-path">docs/sprints/${sprint}/reviews/${r.file}</div></div><span class="review-verdict ${r.verdict === 'approve' ? 'verdict-approve' : 'verdict-revise'}" style="font-size:9px;">${r.verdict === 'approve' ? '\u2713' : '\u26A0'}</span></div>`).join("")}
      </div>
      <h3 style="margin:20px 0 12px;color:var(--text-dim);font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Agents</h3>
      <div class="docs-grid">
        <div class="doc-card" onclick="openFile('.claude/commands/cto.md')"><div class="doc-icon">\uD83C\uDFF7</div><div class="doc-info"><div class="doc-name">CTO Agent</div><div class="doc-path">.claude/commands/cto.md</div></div></div>
        <div class="doc-card" onclick="openFile('.claude/commands/dev.md')"><div class="doc-icon">\u2328</div><div class="doc-info"><div class="doc-name">DEV Agent</div><div class="doc-path">.claude/commands/dev.md</div></div></div>
        <div class="doc-card" onclick="openFile('.claude/commands/qa.md')"><div class="doc-icon">\uD83E\uDDEA</div><div class="doc-info"><div class="doc-name">QA Agent</div><div class="doc-path">.claude/commands/qa.md</div></div></div>
        <div class="doc-card" onclick="openFile('AGENTS.md')"><div class="doc-icon">\uD83D\uDC65</div><div class="doc-info"><div class="doc-name">Agent Constitution</div><div class="doc-path">AGENTS.md</div></div></div>
      </div>
      <h3 style="margin:20px 0 12px;color:var(--text-dim);font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">\u05E7\u05D5\u05D3</h3>
      <div class="docs-grid">
        <div class="doc-card" onclick="openFile('supabase/migrations/001_initial_schema.sql')"><div class="doc-icon">\uD83D\uDDC4</div><div class="doc-info"><div class="doc-name">SQL Schema</div><div class="doc-path">supabase/migrations/001_initial_schema.sql</div></div></div>
        <div class="doc-card" onclick="openFile('supabase/seed.sql')"><div class="doc-icon">\uD83C\uDF31</div><div class="doc-info"><div class="doc-name">Seed Data</div><div class="doc-path">supabase/seed.sql</div></div></div>
        <div class="doc-card" onclick="openFile('src/types/database.ts')"><div class="doc-icon">\uD83D\uDCD0</div><div class="doc-info"><div class="doc-name">TypeScript Types</div><div class="doc-path">src/types/database.ts</div></div></div>
        <div class="doc-card" onclick="openFile('src/lib/supabase.ts')"><div class="doc-icon">\uD83D\uDD17</div><div class="doc-info"><div class="doc-name">Supabase Client</div><div class="doc-path">src/lib/supabase.ts</div></div></div>
        <div class="doc-card" onclick="openFile('src/app/layout.tsx')"><div class="doc-icon">\uD83C\uDFE0</div><div class="doc-info"><div class="doc-name">Root Layout</div><div class="doc-path">src/app/layout.tsx</div></div></div>
        <div class="doc-card" onclick="openFile('src/app/page.tsx')"><div class="doc-icon">\uD83D\uDD12</div><div class="doc-info"><div class="doc-name">PIN Login Page</div><div class="doc-path">src/app/page.tsx</div></div></div>
        <div class="doc-card" onclick="openFile('package.json')"><div class="doc-icon">\uD83D\uDCE6</div><div class="doc-info"><div class="doc-name">package.json</div><div class="doc-path">package.json</div></div></div>
        <div class="doc-card" onclick="openFile('tailwind.config.ts')"><div class="doc-icon">\uD83C\uDFA8</div><div class="doc-info"><div class="doc-name">Tailwind Config</div><div class="doc-path">tailwind.config.ts</div></div></div>
      </div>
    </div>
    <!-- Reviews Tab -->
    <div id="tab-reviews" class="tab-content">
      <h2 style="margin-bottom:20px;">\u05E1\u05E7\u05D9\u05E8\u05D5\u05EA CTO</h2>
      ${reviews.length > 0 ? reviews.map(reviewCard).join("") : '<div style="color:var(--text-muted);padding:20px;">No reviews yet.</div>'}
    </div>
  </main>
</div>
<!-- File Viewer Overlay -->
<div class="viewer-overlay" id="viewer-overlay" onclick="if(event.target===this)closeViewer()">
  <div class="viewer-panel">
    <div class="viewer-header">
      <span class="viewer-path" id="viewer-path"></span>
      <button class="viewer-close" onclick="closeViewer()">\u2715</button>
    </div>
    <div class="viewer-body" id="viewer-body"></div>
  </div>
</div>
<div class="gen-info">Auto-generated by tools/generate-dashboard.mjs \xB7 ${today} \xB7 Refreshes every 30s \xB7 \u05DC\u05D7\u05E5 \u05E2\u05DC \u05DE\u05E1\u05DE\u05DA \u05DB\u05D3\u05D9 \u05DC\u05E7\u05E8\u05D5\u05D0</div>
<script>
// Tab navigation
function showTab(name){document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('visible'));document.getElementById('tab-'+name).classList.add('visible');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));if(event&&event.currentTarget)event.currentTarget.classList.add('active');}

// Embedded file data
const FILE_DATA = ${JSON.stringify(files)};

// Simple markdown→HTML renderer
function renderMarkdown(text) {
  if (!text) return '<p style="color:var(--text-muted);">File not found</p>';
  const ext = currentFilePath.split('.').pop();
  // Non-markdown files: show as code
  if (!['md'].includes(ext)) {
    const lang = ext || 'text';
    const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return '<pre>' + escaped + '</pre>';
  }
  // Markdown rendering
  let html = text;
  // Escape HTML
  html = html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Code blocks
  html = html.replace(/\x60\x60\x60([\\s\\S]*?)\x60\x60\x60/g, (m, code) => '<div class="md-cb"><pre>' + code.trim() + '</pre></div>');
  // Tables
  html = html.replace(/^\\|(.+)\\|\\s*\\n\\|[\\s\\-|:]+\\|\\s*\\n((?:\\|.+\\|\\s*\\n)*)/gm, (match, header, body) => {
    const ths = header.split('|').map(c=>c.trim()).filter(Boolean).map(c=>'<th>'+c+'</th>').join('');
    const rows = body.trim().split('\\n').map(row => {
      const tds = row.split('|').map(c=>c.trim()).filter(Boolean).map(c=>'<td>'+c+'</td>').join('');
      return '<tr>'+tds+'</tr>';
    }).join('');
    return '<table class="md-table"><thead><tr>'+ths+'</tr></thead><tbody>'+rows+'</tbody></table>';
  });
  // Headers
  html = html.replace(/^#### (.+)$/gm, '<div class="md-h4">$1</div>');
  html = html.replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>');
  html = html.replace(/^## (.+)$/gm, '<div class="md-h2">$1</div>');
  html = html.replace(/^# (.+)$/gm, '<div class="md-h1">$1</div>');
  // Horizontal rule
  html = html.replace(/^---+$/gm, '<div class="md-hr"></div>');
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<div class="md-blockquote">$1</div>');
  // Bold
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<span class="md-strong">$1</span>');
  // Inline code
  html = html.replace(/\x60([^\x60]+)\x60/g, '<span class="md-code">$1</span>');
  // List items
  html = html.replace(/^[\\-\\*] (.+)$/gm, '<div class="md-li">$1</div>');
  html = html.replace(/^\\d+\\. (.+)$/gm, '<div class="md-li">$1</div>');
  // Checkboxes
  html = html.replace(/\\[x\\]/g, '\u2705');
  html = html.replace(/\\[ \\]/g, '\u2B1C');
  html = html.replace(/\\[~\\]/g, '\uD83D\uDD35');
  html = html.replace(/\\[!\\]/g, '\uD83D\uDD34');
  // Paragraphs (lines that aren't already wrapped)
  html = html.replace(/^(?!<)(\\S.+)$/gm, '<div class="md-p">$1</div>');
  return html;
}

let currentFilePath = '';
function openFile(filepath) {
  currentFilePath = filepath;
  const content = FILE_DATA[filepath];
  document.getElementById('viewer-path').textContent = filepath;
  document.getElementById('viewer-body').innerHTML = renderMarkdown(content);
  document.getElementById('viewer-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeViewer() {
  document.getElementById('viewer-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeViewer(); });
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
const sprint = findCurrentSprint();
if (!sprint) {
  console.error("No sprint directory found in docs/sprints/");
  process.exit(1);
}

const sprintDir = path.join(ROOT, "docs/sprints", sprint);
const todoFile = path.join(sprintDir, "todo", `${sprint}_todo.md`);
const indexFile = path.join(sprintDir, `${sprint}_index.md`);
const reviewsDir = path.join(sprintDir, "reviews");
const decisionsFile = path.join(ROOT, "docs/DECISIONS.md");

const { dev: devTasks, qa: qaTasks } = parseTodoFile(todoFile);
const sprintMeta = parseSprintIndex(indexFile);
const reviews = findReviews(reviewsDir);
const decisionCount = countDecisions(decisionsFile);
const agents = determineAgentStates(devTasks, qaTasks);
const pipeline = buildPipeline(devTasks, reviews);
const today = new Date().toISOString().split("T")[0];
const files = collectFiles(ROOT, sprint);

const html = generateHTML({
  sprint, sprintMeta, devTasks, qaTasks, agents, pipeline, reviews, decisionCount, today, files,
});

fs.writeFileSync(OUT, html, "utf-8");

const devDone = devTasks.filter(t => t.status === "done").length;
const qaDone = qaTasks.filter(t => t.status === "done").length;
console.log(`✓ Dashboard generated: ${OUT}`);
console.log(`  Sprint: ${sprint} | Dev: ${devDone}/${devTasks.length} | QA: ${qaDone}/${qaTasks.length}`);
console.log(`  Next DEV: ${agents.dev.next}`);
console.log(`  CTO: ${agents.cto.label} | QA: ${agents.qa.label}`);
