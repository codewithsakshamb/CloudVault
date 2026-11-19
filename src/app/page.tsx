"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  LayoutDashboard, Folder, FileText, Star, Share2, Trash2,
  Settings, Search, Bell, Plus, Upload, Cloud, HardDrive,
  Image, File, FileSpreadsheet, MoreHorizontal, Download,
  Menu, X, ChevronRight, ShieldCheck, Zap,
  LayoutGrid, List, CheckCircle2, AlertCircle, CloudUpload, Loader2,
  FileArchive, FileVideo, FileAudio, type LucideIcon
} from "lucide-react";

type CloudFile = {
  userId: string;
  fileId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  s3Key: string;
  uploadedAt: string;
};

type Toast = { type: "success" | "error"; message: string } | null;
type ViewMode = "list" | "grid";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My Files", icon: Folder },
  { name: "Recent", icon: FileText },
  { name: "Starred", icon: Star },
  { name: "Shared", icon: Share2 },
  { name: "Trash", icon: Trash2 },
];

// Views that exist in the UI but are not wired to the backend yet.
const COMING_SOON: Record<string, { icon: LucideIcon; text: string }> = {
  Starred: { icon: Star, text: "Starring files isn't set up yet. Coming soon." },
  Shared: { icon: Share2, text: "Sharing isn't configured yet. Coming soon." },
  Trash: { icon: Trash2, text: "Trash isn't set up yet. Deleted files are removed permanently for now." },
  Settings: { icon: Settings, text: "Settings aren't available yet. Coming soon." },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toUpperCase() : "FILE";
}

function fileMeta(ext: string): { icon: LucideIcon; color: string } {
  if (ext === "PDF") return { icon: FileText, color: "text-red-500 bg-red-50" };
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG"].includes(ext))
    return { icon: Image, color: "text-purple-500 bg-purple-50" };
  if (["XLS", "XLSX", "CSV"].includes(ext))
    return { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" };
  if (["PPT", "PPTX"].includes(ext))
    return { icon: File, color: "text-orange-500 bg-orange-50" };
  if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(ext))
    return { icon: FileArchive, color: "text-amber-600 bg-amber-50" };
  if (["MP4", "MOV", "MKV", "AVI", "WEBM"].includes(ext))
    return { icon: FileVideo, color: "text-pink-500 bg-pink-50" };
  if (["MP3", "WAV", "M4A", "FLAC"].includes(ext))
    return { icon: FileAudio, color: "text-cyan-600 bg-cyan-50" };
  if (["DOC", "DOCX", "TXT"].includes(ext))
    return { icon: FileText, color: "text-blue-500 bg-blue-50" };
  return { icon: File, color: "text-blue-500 bg-blue-50" };
}

/* ---------- Small presentational components ---------- */

function FileActions({
  file, busy, onDownload, onDelete,
}: {
  file: CloudFile;
  busy: boolean;
  onDownload: (f: CloudFile) => void;
  onDelete: (f: CloudFile) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        disabled={busy}
        onClick={() => onDownload(file)}
        title="Download file"
        aria-label={`Download ${file.fileName}`}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 active:scale-90 disabled:opacity-40"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>
      <button
        disabled={busy}
        onClick={() => onDelete(file)}
        title="Delete file"
        aria-label={`Delete ${file.fileName}`}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 active:scale-90 disabled:opacity-40"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function FileTable({
  files, busyFile, onDownload, onDelete,
}: {
  files: CloudFile[];
  busyFile: string;
  onDownload: (f: CloudFile) => void;
  onDelete: (f: CloudFile) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-400">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Size</th>
            <th className="px-5 py-3 font-medium">Modified</th>
            <th className="px-5 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, i) => {
            const ext = getExt(file.fileName);
            const { icon: Icon, color } = fileMeta(ext);
            return (
              <tr
                key={file.fileId}
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                className="animate-fade-up group border-b border-slate-50 transition-colors hover:bg-blue-50/40"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${color}`}>
                      <Icon size={19} />
                    </div>
                    <span className="max-w-[320px] truncate text-sm font-semibold text-slate-700">
                      {file.fileName}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                    {ext}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">{formatSize(file.fileSize)}</td>
                <td className="px-5 py-4 text-xs text-slate-500">{formatDate(file.uploadedAt)}</td>
                <td className="px-5 py-4">
                  <FileActions
                    file={file}
                    busy={busyFile === file.fileId}
                    onDownload={onDownload}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FileGrid({
  files, busyFile, onDownload, onDelete,
}: {
  files: CloudFile[];
  busyFile: string;
  onDownload: (f: CloudFile) => void;
  onDelete: (f: CloudFile) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {files.map((file, i) => {
        const ext = getExt(file.fileName);
        const { icon: Icon, color } = fileMeta(ext);
        return (
          <div
            key={file.fileId}
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            className="animate-fade-up group rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${color}`}>
                <Icon size={22} />
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                {ext}
              </span>
            </div>
            <p className="mt-4 truncate text-sm font-semibold text-slate-700" title={file.fileName}>
              {file.fileName}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatSize(file.fileSize)} · {formatDate(file.uploadedAt)}
            </p>
            <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
              <FileActions
                file={file}
                busy={busyFile === file.fileId}
                onDownload={onDownload}
                onDelete={onDelete}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-50">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="skeleton h-10 w-10 shrink-0 !rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3 w-1/5" />
          </div>
          <div className="skeleton hidden h-3 w-16 sm:block" />
          <div className="skeleton hidden h-3 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Page ---------- */

export default function Home() {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState({ current: 0, total: 0, name: "" });
  const [busyFile, setBusyFile] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [deleteTarget, setDeleteTarget] = useState<CloudFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");
  const [barReady, setBarReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  async function loadFiles() {
    if (!API) {
      setError("API URL missing. Check your .env.local file.");
      setLoading(false);
      return;
    }

    try {
      setError("");
      const res = await fetch(`${API}/files`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Could not load files.");

      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load files.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  // Time-based greeting (client only, avoids hydration mismatch)
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    const t = setTimeout(() => setBarReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Escape closes menu / modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleteTarget(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleUpload(selected?: FileList | null) {
    if (!selected || selected.length === 0) return;

    const list = Array.from(selected);
    let done = 0;

    setUploading(true);
    setError("");

    try {
      for (const file of list) {
        setUploadInfo({ current: done + 1, total: list.length, name: file.name });

        // Step 1: Request a presigned S3 upload URL.
        const urlRes = await fetch(`${API}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        });

        const urlData = await urlRes.json();
        if (!urlRes.ok) {
          throw new Error(urlData.error || `Could not prepare ${file.name}`);
        }

        // Step 2: Upload the actual file directly to S3.
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`S3 upload failed for ${file.name}`);
        }

        done += 1;
      }

      await loadFiles();
      setToast({
        type: "success",
        message: done === 1 ? "File uploaded successfully" : `${done} files uploaded successfully`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      // Refresh so files that did upload before the failure show up.
      if (done > 0) await loadFiles();
      setError(message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDownload(file: CloudFile) {
    setBusyFile(file.fileId);
    setError("");

    try {
      const res = await fetch(`${API}/download-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.fileId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Download failed.");

      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setToast({ type: "success", message: `Downloading "${file.fileName}"` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusyFile("");
    }
  }

  async function confirmDelete() {
    const file = deleteTarget;
    if (!file) return;

    setBusyFile(file.fileId);
    setError("");

    try {
      const res = await fetch(
        `${API}/files/${encodeURIComponent(file.fileId)}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");

      setFiles(prev => prev.filter(item => item.fileId !== file.fileId));
      setToast({ type: "success", message: `"${file.fileName}" deleted` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyFile("");
      setDeleteTarget(null);
    }
  }

  /* ----- Drag & drop upload ----- */
  function hasFiles(e: DragEvent) {
    return Array.from(e.dataTransfer?.types || []).includes("Files");
  }
  function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }
  function onDragOver(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
  }
  function onDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }
  function onDrop(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!uploading) handleUpload(e.dataTransfer.files);
  }

  const sorted = useMemo(
    () =>
      [...files].sort(
        (a, b) => (Date.parse(b.uploadedAt) || 0) - (Date.parse(a.uploadedAt) || 0)
      ),
    [files]
  );

  const filtered = useMemo(
    () => sorted.filter(file =>
      file.fileName.toLowerCase().includes(search.toLowerCase())
    ),
    [sorted, search]
  );

  const totalBytes = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
  const usedPct = Math.min((totalBytes / (5 * 1024 ** 3)) * 100, 100);

  const soon = COMING_SOON[active];
  const OVERVIEW_LIMIT = 6;
  const RECENT_LIMIT = 10;
  const visible =
    search || active === "My Files"
      ? filtered
      : active === "Recent"
        ? filtered.slice(0, RECENT_LIMIT)
        : filtered.slice(0, OVERVIEW_LIMIT);
  const hasMore = !search && active === "Overview" && filtered.length > OVERVIEW_LIMIT;
  const cardTitle = active === "My Files" ? "All files" : "Recent files";

  return (
    <main
      className="min-h-screen bg-[#f7f8fc] text-slate-800"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex min-h-screen">

        {/* Mobile backdrop */}
        {menuOpen && (
          <div
            className="animate-fade-in fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside className={`${menuOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-5 transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0`}>
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-600/30">
                <Cloud size={23} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">CloudVault</h1>
                <p className="text-[10px] font-semibold uppercase tracking-[2px] text-slate-400">Cloud Storage</p>
              </div>
            </div>
            <button className="md:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X /></button>
          </div>

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
          <nav className="space-y-1">
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = active === item.name;
              return (
                <button key={item.name}
                  onClick={() => { setActive(item.name); setMenuOpen(false); }}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:translate-x-0.5 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 transition-all duration-300 ${isActive ? "opacity-100" : "opacity-0"}`} />
                  <Icon size={18} />
                  {item.name}
                  {item.name === "My Files" && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{files.length}</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-9">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Preferences</p>
            <button onClick={() => { setActive("Settings"); setMenuOpen(false); }}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${active === "Settings" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:translate-x-0.5 hover:bg-slate-50"}`}>
              <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 transition-all duration-300 ${active === "Settings" ? "opacity-100" : "opacity-0"}`} />
              <Settings size={18} /> Settings
            </button>
          </div>

          <div className="mt-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-lg shadow-slate-900/20">
            <div className="mb-3 flex items-center justify-between">
              <HardDrive size={20} className="text-blue-400" />
              <span className="text-xs text-slate-400">DEMO PLAN</span>
            </div>
            <p className="text-sm font-semibold">Storage usage</p>
            <p className="mt-1 text-xs text-slate-400">{formatSize(totalBytes)} of 5 GB used</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-[width] duration-1000 ease-out"
                style={{ width: barReady ? `${Math.max(usedPct, totalBytes > 0 ? 1.5 : 0)}%` : "0%" }} />
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-blue-300"><Zap size={13} /> S3 cloud storage</p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 font-bold text-blue-700">S</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Saksham</p>
              <p className="text-xs text-slate-400">Demo account</p>
            </div>
            <MoreHorizontal size={20} className="text-slate-400" />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/80 px-5 backdrop-blur-xl md:px-9">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-1 transition active:scale-90 md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu /></button>
              <div>
                <p className="text-xs text-slate-400">Workspace / {active}</p>
                <h2 key={active} className="animate-fade-in text-lg font-bold text-slate-900">{active}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button aria-label="Notifications" className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 active:scale-90">
                <Bell size={18} />
              </button>
              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 font-bold text-blue-700 sm:flex">S</div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 p-5 md:p-9">
            <div className="animate-fade-up flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{greeting}, Saksham <span className="inline-block origin-[70%_70%] animate-float">👋</span></h2>
                <p className="mt-1 text-sm text-slate-500">Manage your files and keep everything in one place.</p>
              </div>
              <button disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="group flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-60">
                {uploading
                  ? <Loader2 size={17} className="animate-spin" />
                  : <Upload size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5" />}
                {uploading ? "Uploading..." : "Upload files"}
              </button>
              <input ref={fileRef} type="file" multiple className="hidden"
                onChange={e => handleUpload(e.target.files)} />
            </div>

            {uploading && (
              <div className="animate-pop-in rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm">
                  <p className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                    <Loader2 size={16} className="shrink-0 animate-spin text-blue-600" />
                    <span className="truncate">Uploading {uploadInfo.name}</span>
                  </p>
                  <span className="ml-3 shrink-0 text-xs text-slate-400">
                    {uploadInfo.current} of {uploadInfo.total}
                  </span>
                </div>
                <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-blue-50">
                  <div className="animate-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="animate-pop-in flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <span className="flex items-center gap-2"><AlertCircle size={17} className="shrink-0" />{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError("")} className="rounded-lg p-1 transition hover:bg-red-100 active:scale-90"><X size={17} /></button>
              </div>
            )}

            {active === "Overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Total Files", value: files.length.toString(), icon: FileText, color: "bg-blue-50 text-blue-600", sub: "Files in your workspace" },
                    { label: "Storage Used", value: formatSize(totalBytes), icon: HardDrive, color: "bg-purple-50 text-purple-600", sub: "Stored in your S3 bucket" },
                    { label: "Shared Files", value: "0", icon: Share2, color: "bg-emerald-50 text-emerald-600", sub: "Sharing not configured" },
                    { label: "Storage", value: "S3", icon: ShieldCheck, color: "bg-orange-50 text-orange-600", sub: "AWS cloud storage" },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label}
                        style={{ animationDelay: `${i * 70}ms` }}
                        className="animate-fade-up group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                          <div className={`rounded-xl p-2.5 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${stat.color}`}><Icon size={19} /></div>
                        </div>
                        <h3 className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</h3>
                        <p className="mt-1 text-xs text-slate-400">{stat.sub}</p>
                      </div>
                    );
                  })}
                </div>

                <div style={{ animationDelay: "280ms" }}
                  className="animate-fade-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-900/10 md:p-8">
                  <div className="animate-blob pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                  <div className="animate-blob pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-indigo-300/20 blur-3xl [animation-delay:3s]" />
                  <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-medium tracking-wide text-blue-100">YOUR CLOUD SPACE</p>
                      <h3 className="mt-2 text-3xl font-bold">Everything, securely stored.</h3>
                      <p className="mt-2 max-w-lg text-sm text-blue-100">Access, organize and manage your digital files from one central workspace.</p>
                      <button onClick={() => fileRef.current?.click()}
                        className="mt-5 flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg active:translate-y-0 active:scale-95">
                        <Plus size={17} /> Add new files
                      </button>
                    </div>
                    <div className="animate-float hidden h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm sm:flex">
                      <Cloud size={68} strokeWidth={1.2} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {soon ? (
              <div key={active} className="animate-fade-up flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                <div className="animate-float flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <soon.icon size={28} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{active}</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">{soon.text}</p>
              </div>
            ) : (
              <div style={{ animationDelay: active === "Overview" ? "350ms" : "0ms" }}
                className="animate-fade-up rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">{cardTitle}</h3>
                    <p className="mt-1 text-xs text-slate-400">Files stored in your AWS S3 bucket</p>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search files..."
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                      {search && (
                        <button aria-label="Clear search" onClick={() => setSearch("")}
                          className="animate-fade-in absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex shrink-0 rounded-xl border border-slate-200 p-1">
                      <button aria-label="List view" onClick={() => setView("list")}
                        className={`rounded-lg p-1.5 transition ${view === "list" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
                        <List size={16} />
                      </button>
                      <button aria-label="Grid view" onClick={() => setView("grid")}
                        className={`rounded-lg p-1.5 transition ${view === "grid" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
                        <LayoutGrid size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <SkeletonRows />
                ) : visible.length === 0 ? (
                  <div className="animate-fade-in flex flex-col items-center px-6 py-16 text-center">
                    <div className="animate-float flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                      {search ? <Search size={28} /> : <CloudUpload size={28} />}
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      {search ? "No matching files found." : "No files uploaded yet."}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {search ? "Try a different search term." : "Drag & drop files anywhere, or click below."}
                    </p>
                    {!search && (
                      <button onClick={() => fileRef.current?.click()}
                        className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95">
                        <Upload size={16} /> Upload your first file
                      </button>
                    )}
                  </div>
                ) : view === "list" ? (
                  <FileTable key={`${active}-list`} files={visible} busyFile={busyFile} onDownload={handleDownload} onDelete={setDeleteTarget} />
                ) : (
                  <FileGrid key={`${active}-grid`} files={visible} busyFile={busyFile} onDownload={handleDownload} onDelete={setDeleteTarget} />
                )}

                <div className="flex items-center justify-between border-t border-slate-50 p-5">
                  <p className="text-xs text-slate-400">
                    Showing {visible.length}{filtered.length !== visible.length ? ` of ${filtered.length}` : ""} files
                  </p>
                  {hasMore && (
                    <button onClick={() => { setActive("My Files"); setSearch(""); }}
                      className="group flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-800">
                      View all files <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
              <p>© 2026 CloudVault. Secure cloud storage.</p>
              <p className="flex items-center gap-1"><ShieldCheck size={14} /> Your files. Your control.</p>
            </footer>
          </div>
        </section>
      </div>

      {/* Drag & drop overlay */}
      {dragging && (
        <div className="animate-fade-in pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-600/10 p-6 backdrop-blur-sm">
          <div className="flex w-full max-w-xl flex-col items-center rounded-3xl border-2 border-dashed border-blue-500 bg-white/90 px-8 py-16 text-center shadow-2xl">
            <div className="animate-drop-pulse flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <CloudUpload size={38} />
            </div>
            <p className="mt-5 text-xl font-bold text-slate-900">Drop files to upload</p>
            <p className="mt-1 text-sm text-slate-500">Release to send them to your S3 bucket</p>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => busyFile ? undefined : setDeleteTarget(null)}>
          <div role="dialog" aria-modal="true" className="animate-pop-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 size={22} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Delete file?</h3>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-semibold text-slate-700 break-all">&quot;{deleteTarget.fileName}&quot;</span> will be permanently deleted. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button disabled={!!busyFile} onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50">
                Cancel
              </button>
              <button disabled={!!busyFile} onClick={confirmDelete}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-60">
                {busyFile && <Loader2 size={15} className="animate-spin" />}
                {busyFile ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div key={toast.message} role="status"
          className="animate-toast-in fixed bottom-5 right-5 z-[60] flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          <span className="truncate">{toast.message}</span>
          <button aria-label="Dismiss" onClick={() => setToast(null)} className="rounded-md p-0.5 text-slate-400 transition hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}
