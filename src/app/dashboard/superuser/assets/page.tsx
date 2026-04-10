"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  ImageIcon,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIconLucide,
  User,
  LayoutGrid,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface GraphicAsset {
  id: string;
  url: string;
  storagePath: string;
  role: string;
  denominationCluster?: string;
  styleVersion?: string;
  gender?: string;
  assetType?: string;
  approved: boolean;
  generatedAt?: Timestamp;
}

// --- Category definitions: add new entries here as we expand ---
const CATEGORIES = [
  { key: "__all__",    label: "All",            roles: null,           icon: LayoutGrid,        aspectClass: "" },
  { key: "flyer_hero", label: "Flyer Headers",  roles: ["flyer_hero"], icon: ImageIconLucide,   aspectClass: "aspect-video" },
  { key: "avatar",     label: "Avatars",        roles: ["avatar"],     icon: User,              aspectClass: "aspect-square" },
  { key: "__other__",  label: "Other",          roles: null,           icon: LayoutGrid,        aspectClass: "aspect-video" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const KNOWN_ROLES = new Set(["flyer_hero", "avatar"]);

function getCategoryKey(role: string): CategoryKey {
  if (role === "flyer_hero") return "flyer_hero";
  if (role === "avatar") return "avatar";
  return "__other__";
}

function getAspectClass(role: string): string {
  if (role === "avatar") return "aspect-square";
  return "aspect-video";
}

export default function AssetsPage() {
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<GraphicAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvedFilter, setApprovedFilter] = useState<"all" | "approved" | "pending">("all");
  const [activeTab, setActiveTab] = useState<CategoryKey>("__all__");

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRole, setUploadRole] = useState<string>("flyer_hero");
  const [uploadDenom, setUploadDenom] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Lightbox state
  const [lightboxAsset, setLightboxAsset] = useState<GraphicAsset | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Delete state
  const [pendingDelete, setPendingDelete] = useState<GraphicAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAssets = () => {
    if (!firestore) return;
    setIsLoading(true);
    getDocs(query(collection(firestore, "graphic_assets"), orderBy("generatedAt", "desc")))
      .then((snap) => setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GraphicAsset))))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadAssets(); }, [firestore]);

  // Assets filtered by approval, then grouped by category key
  const filtered = useMemo(() => assets.filter((a) =>
    approvedFilter === "all" ? true :
    approvedFilter === "approved" ? a.approved : !a.approved
  ), [assets, approvedFilter]);

  const grouped = useMemo(() => {
    const result: Record<string, GraphicAsset[]> = { __all__: filtered };
    for (const cat of CATEGORIES) {
      if (cat.key === "__all__") continue;
      if (cat.key === "__other__") {
        result.__other__ = filtered.filter((a) => !KNOWN_ROLES.has(a.role));
      } else {
        result[cat.key] = filtered.filter((a) => (cat.roles as readonly string[] | null)?.includes(a.role));
      }
    }
    return result;
  }, [filtered]);

  // Assets shown in the current tab (used for lightbox navigation)
  const activeAssets = grouped[activeTab] ?? [];

  const openLightbox = (asset: GraphicAsset) => {
    const idx = activeAssets.findIndex((a) => a.id === asset.id);
    setLightboxIndex(idx);
    setLightboxAsset(asset);
  };

  const navigateLightbox = (direction: -1 | 1) => {
    const next = lightboxIndex + direction;
    if (next < 0 || next >= activeAssets.length) return;
    setLightboxIndex(next);
    setLightboxAsset(activeAssets[next]);
  };

  const handleApproveToggle = async (asset: GraphicAsset) => {
    const next = !asset.approved;
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, approved: next } : a)));
    if (lightboxAsset?.id === asset.id) setLightboxAsset({ ...asset, approved: next });
    try {
      const res = await fetch("/api/superuser/asset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, approved: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(next ? "Asset approved." : "Approval revoked.");
    } catch (e: any) {
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, approved: !next } : a)));
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/superuser/asset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: pendingDelete.id, storagePath: pendingDelete.storagePath }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAssets((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      if (lightboxAsset?.id === pendingDelete.id) setLightboxAsset(null);
      toast.success("Asset deleted.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) { toast.error("Please select a file."); return; }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("role", uploadRole);
      if (uploadDenom) form.append("denominationCluster", uploadDenom);
      const res = await fetch("/api/superuser/asset", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Asset uploaded.");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadDenom("");
      setUploadRole("flyer_hero");
      loadAssets();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const totalApproved = assets.filter((a) => a.approved).length;
  const totalPending = assets.filter((a) => !a.approved).length;

  // Unique denomination clusters for the upload form hint
  const denomClusters = useMemo(() =>
    [...new Set(assets.map((a) => a.denominationCluster).filter(Boolean))] as string[],
  [assets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Image Assets</h1>
          <p className="text-muted-foreground">Manage stock images available across the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={approvedFilter} onValueChange={(v) => setApprovedFilter(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved only</SelectItem>
              <SelectItem value="pending">Pending only</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button><Upload className="h-4 w-4 mr-2" /> Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Image File</Label>
                  <Input ref={fileInputRef} type="file" accept="image/*" className="mt-1"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                </div>
                <div>
                  <Label>Usage Type</Label>
                  <Select value={uploadRole} onValueChange={setUploadRole}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flyer_hero">Flyer Header</SelectItem>
                      <SelectItem value="avatar">Avatar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Denomination Cluster <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Liturgical, Evangelical…"
                    value={uploadDenom}
                    list="denom-suggestions"
                    onChange={(e) => setUploadDenom(e.target.value)}
                  />
                  <datalist id="denom-suggestions">
                    {denomClusters.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </div>
                {uploadFile && <p className="text-sm text-muted-foreground">Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleUpload} disabled={isUploading || !uploadFile}>
                  {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-4 px-5 py-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <ImageIconLucide className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Assets</p>
              <p className="text-2xl font-bold text-primary">{assets.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 px-5 py-4">
            <div className="rounded-lg bg-teal-100 p-2.5 shrink-0">
              <CheckCircle2 className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Approved</p>
              <p className="text-2xl font-bold text-teal-700">{totalApproved}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 px-5 py-4">
            <div className="rounded-lg bg-amber-100 p-2.5 shrink-0">
              <XCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Review</p>
              <p className="text-2xl font-bold text-amber-700">{totalPending}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage-type Tabs */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryKey)}>
          <TabsList className="w-full justify-start mb-4 h-auto flex-wrap gap-1">
            {CATEGORIES.map((cat) => {
              const count = grouped[cat.key]?.length ?? 0;
              // Hide "Other" tab if empty
              if (cat.key === "__other__" && count === 0) return null;
              return (
                <TabsTrigger key={cat.key} value={cat.key} className="gap-2">
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {CATEGORIES.map((cat) => {
            const catAssets = grouped[cat.key] ?? [];
            if (cat.key === "__other__" && catAssets.length === 0) return null;
            return (
              <TabsContent key={cat.key} value={cat.key}>
                {catAssets.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground border rounded-lg">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No {approvedFilter !== "all" ? approvedFilter : ""} assets in this category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {catAssets.map((asset) => {
                      const aspectClass = getAspectClass(asset.role);
                      return (
                        <button
                          key={asset.id}
                          onClick={() => openLightbox(asset)}
                          className="group relative rounded-lg border overflow-hidden bg-muted text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className={`${aspectClass} relative`}>
                            <Image
                              src={asset.url}
                              alt={`${asset.role} asset`}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              unoptimized
                            />
                            <div className="absolute top-1.5 right-1.5">
                              {asset.approved
                                ? <CheckCircle2 className="h-5 w-5 text-green-400 drop-shadow" />
                                : <XCircle className="h-5 w-5 text-yellow-400 drop-shadow" />}
                            </div>
                          </div>
                          <div className="px-2 py-1.5">
                            <p className="text-xs text-muted-foreground truncate">
                              {[asset.denominationCluster, asset.styleVersion || asset.gender].filter(Boolean).join(" · ") || asset.role}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Lightbox */}
      {lightboxAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxAsset(null); }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
            <div className="flex items-center gap-3">
              <Badge variant={lightboxAsset.approved ? "default" : "warning"} className="text-xs">
                {lightboxAsset.approved ? "Approved" : "Pending"}
              </Badge>
              <span className="text-sm text-white/60">
                {[
                  CATEGORIES.find((c) => c.key === getCategoryKey(lightboxAsset.role))?.label,
                  lightboxAsset.denominationCluster,
                  lightboxAsset.styleVersion || lightboxAsset.gender,
                ].filter(Boolean).join(" · ")}
              </span>
              <span className="text-sm text-white/40">{lightboxIndex + 1} / {activeAssets.length}</span>
            </div>
            <button onClick={() => setLightboxAsset(null)} className="p-1 rounded hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image + nav */}
          <div className="flex-1 flex items-center justify-center relative min-h-0 px-16">
            <button
              onClick={() => navigateLightbox(-1)}
              disabled={lightboxIndex === 0}
              className="absolute left-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className={`relative w-full max-w-4xl ${getAspectClass(lightboxAsset.role)} rounded-lg overflow-hidden shadow-2xl`}>
              <Image
                src={lightboxAsset.url}
                alt={lightboxAsset.role}
                fill
                className="object-contain"
                unoptimized
                priority
              />
            </div>

            <button
              onClick={() => navigateLightbox(1)}
              disabled={lightboxIndex === activeAssets.length - 1}
              className="absolute right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-center gap-3 px-4 py-4 shrink-0">
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => handleApproveToggle(lightboxAsset)}
            >
              {lightboxAsset.approved
                ? <><XCircle className="h-4 w-4 mr-2" />Unapprove</>
                : <><CheckCircle2 className="h-4 w-4 mr-2" />Approve</>}
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setPendingDelete(lightboxAsset); setLightboxAsset(null); }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>

          {/* Thumbnail strip */}
          {activeAssets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 shrink-0 justify-center">
              {activeAssets.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => { setLightboxIndex(i); setLightboxAsset(a); }}
                  className={`relative h-14 shrink-0 overflow-hidden border-2 rounded transition-all ${
                    a.role === "avatar" ? "w-14" : "w-24"
                  } ${i === lightboxIndex ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}
                >
                  <Image src={a.url} alt="" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the image from Firebase Storage and Firestore. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
