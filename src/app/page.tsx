
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, Folder, FileText, Star, Share2, Trash2,
  Settings, Search, Bell, Plus, Upload, Cloud, HardDrive,
  Image, File, FileSpreadsheet, MoreHorizontal, Download,
  Menu, X, ChevronRight, ShieldCheck, Zap
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

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "My Files", icon: Folder },
  { name: "Recent", icon: FileText },
  { name: "Starred", icon: Star },
  { name: "Shared", icon: Share2 },
  { name: "Trash", icon: Trash2 },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function fileColor(type: string) {
  if (type.includes("PDF")) return "text-red-500 bg-red-50";
  if (type.includes("PNG") || type.includes("JPG") || type.includes("JPEG"))
    return "text-purple-500 bg-purple-50";
  if (type.includes("XLS") || type.includes("CSV"))
    return "text-emerald-600 bg-emerald-50";
  if (type.includes("PPT")) return "text-orange-500 bg-orange-50";
  return "text-blue-500 bg-blue-50";
}

export default function Home() {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyFile, setBusyFile] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function handleUpload(selected?: FileList | null) {
    if (!selected || selected.length === 0) return;

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(selected)) {
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
      }

      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusyFile("");
    }
  }

  async function handleDelete(file: CloudFile) {
    if (!window.confirm(`Delete "${file.fileName}" permanently?`)) return;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyFile("");
    }
  }

  const filtered = useMemo(
    () => files.filter(file =>
      file.fileName.toLowerCase().includes(search.toLowerCase())
    ),
    [files, search]
  );

  const totalBytes = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-800">
      <div className="flex min-h-screen">

        <aside className={`${menuOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-5 transition-transform duration-200 md:static md:translate-x-0`}>
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Cloud size={23} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">CloudVault</h1>
                <p className="text-[10px] font-semibold uppercase tracking-[2px] text-slate-400">Cloud Storage</p>
              </div>
            </div>
            <button className="md:hidden" onClick={() => setMenuOpen(false)}><X /></button>
          </div>

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
          <nav className="space-y-1">
            {navigation.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.name}
                  onClick={() => { setActive(item.name); setMenuOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active === item.name ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <Icon size={18} />
                  {item.name}
                  {item.name === "My Files" && <span className="ml-auto text-xs text-slate-400">{files.length}</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-9">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Preferences</p>
            <button onClick={() => setActive("Settings")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${active === "Settings" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>
              <Settings size={18} /> Settings
            </button>
          </div>

          <div className="mt-auto rounded-2xl bg-slate-900 p-4 text-white">
            <div className="mb-3 flex items-center justify-between">
              <HardDrive size={20} className="text-blue-400" />
              <span className="text-xs text-slate-400">DEMO PLAN</span>
            </div>
            <p className="text-sm font-semibold">Storage usage</p>
            <p className="mt-1 text-xs text-slate-400">{formatSize(totalBytes)} used</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.min((totalBytes / (5 * 1024 ** 3)) * 100, 100)}%` }} />
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-blue-300"><Zap size={13} /> S3 cloud storage</p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">S</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Saksham</p>
              <p className="text-xs text-slate-400">Demo account</p>
            </div>
            <MoreHorizontal size={20} className="text-slate-400" />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-9">
            <div className="flex items-center gap-3">
              <button className="md:hidden" onClick={() => setMenuOpen(true)}><Menu /></button>
              <div>
                <p className="text-xs text-slate-400">Workspace / {active}</p>
                <h2 className="text-lg font-bold text-slate-900">{active}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button aria-label="Notifications" className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
                <Bell size={18} />
              </button>
              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 sm:flex">S</div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 p-5 md:p-9">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Good evening, Saksham 👋</h2>
                <p className="mt-1 text-sm text-slate-500">Manage your files and keep everything in one place.</p>
              </div>
              <button disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60">
                <Upload size={17} /> {uploading ? "Uploading..." : "Upload files"}
              </button>
              <input ref={fileRef} type="file" multiple className="hidden"
                onChange={e => handleUpload(e.target.files)} />
            </div>

            {error && (
              <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <span>{error}</span>
                <button onClick={() => setError("")}><X size={17} /></button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Files", value: files.length.toString(), icon: FileText, color: "bg-blue-50 text-blue-600", sub: "Files in your workspace" },
                { label: "Storage Used", value: formatSize(totalBytes), icon: HardDrive, color: "bg-purple-50 text-purple-600", sub: "Stored in your S3 bucket" },
                { label: "Shared Files", value: "0", icon: Share2, color: "bg-emerald-50 text-emerald-600", sub: "Sharing not configured" },
                { label: "Storage", value: "S3", icon: ShieldCheck, color: "bg-orange-50 text-orange-600", sub: "AWS cloud storage" },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <div className={`rounded-xl p-2.5 ${stat.color}`}><Icon size={19} /></div>
                    </div>
                    <h3 className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</h3>
                    <p className="mt-1 text-xs text-slate-400">{stat.sub}</p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-6 text-white shadow-lg shadow-blue-900/10 md:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium text-blue-100">YOUR CLOUD SPACE</p>
                  <h3 className="mt-2 text-3xl font-bold">Everything, securely stored.</h3>
                  <p className="mt-2 max-w-lg text-sm text-blue-100">Access, organize and manage your digital files from one central workspace.</p>
                  <button onClick={() => fileRef.current?.click()}
                    className="mt-5 flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
                    <Plus size={17} /> Add new files
                  </button>
                </div>
                <div className="hidden h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-white/10 sm:flex">
                  <Cloud size={68} strokeWidth={1.2} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-slate-900">Recent files</h3>
                  <p className="mt-1 text-xs text-slate-400">Files stored in your AWS S3 bucket</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search files..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

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
                    {loading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-400">Loading files...</td></tr>
                    ) : filtered.map(file => {
                      const type = file.fileName.split(".").pop()?.toUpperCase() || "FILE";
                      const Icon = ["PNG", "JPG", "JPEG"].includes(type)
                        ? Image
                        : type === "XLSX" || type === "CSV"
                          ? FileSpreadsheet
                          : File;

                      return (
                        <tr key={file.fileId} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${fileColor(type)}`}>
                                <Icon size={19} />
                              </div>
                              <span className="text-sm font-semibold text-slate-700">{file.fileName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">{type}</td>
                          <td className="px-5 py-4 text-xs text-slate-500">{formatSize(file.fileSize)}</td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button disabled={busyFile === file.fileId}
                                onClick={() => handleDownload(file)}
                                title="Download file"
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40">
                                <Download size={16} />
                              </button>
                              <button disabled={busyFile === file.fileId}
                                onClick={() => handleDelete(file)}
                                title="Delete file"
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sm text-slate-400">
                          {search ? "No matching files found." : "No files uploaded yet. Upload your first file."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-5">
                <p className="text-xs text-slate-400">Showing {filtered.length} files</p>
                <button onClick={() => { setActive("My Files"); setSearch(""); }}
                  className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">
                  View all files <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
              <p>© 2026 CloudVault. Secure cloud storage.</p>
              <p className="flex items-center gap-1"><ShieldCheck size={14} /> Your files. Your control.</p>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
