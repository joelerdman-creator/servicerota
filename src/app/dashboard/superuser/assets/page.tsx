"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface GraphicAsset {
  id: string;
  url: string;
  storagePath: string;
  role: string;
  denominationCluster: string;
  styleVersion: string;
  approved: boolean;
  generatedAt?: Timestamp;
}

const ROLES = ["flyer_hero"] as const;
const PREFERRED_ORDER = ["Liturgical", "Mainline", "Evangelical", "Charismatic"];

export default function AssetsPage() {
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<GraphicAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvedFilter, setApprovedFilter] = useState<"all" | "approved" | "pending">("all");

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDenom, setUploadDenom] = useState<string>("");
  const [uploadRole, setUploadRole] = useState<string>("flyer_hero");
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
    getDocs(query(collection(firestore, "graphic_assets"), orderBy("denominationCluster"), orderBy("generatedAt", "desc")))
      .then((snap) => setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GraphicAsset))))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadAssets(); }, [firestore]);

  // Derive actual denomination clusters from loaded data, sorted by preferred order
  const denomClusters = useMemo(() => {
    const found = [...new Set(assets.map((a) => a.denominationCluster))];
    return found.sort((a, b) => {
      const ai = PREFERRED_ORDER.indexOf(a);
      const bi = PREFERRED_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [assets]);

  // Assets grouped by denomination, with approval filter applied
  const grouped = useMemo(() => {
    const result: Record<string, GraphicAsset[]> = { __all__: [] };
    for (const denom of denomClusters) {
      result[denom] = assets.filter((a) => {
        const matchesDenom = a.denominationCluster === denom;
        const matchesApproved =
          approvedFilter === "all" ||
          (approvedFilter === "approved" && a.approved) ||
          (approvedFilter === "pending" && !a.approved);
        return matchesDenom && matchesApproved;
      });
    }
    result.__all__ = assets.filter((a) =>
      approvedFilter === "all" ? true :
      approvedFilter === "approved" ? a.approved : !a.approved
    );
    return result;
  }, [assets, approvedFilter, denomClusters]);

  const openLightbox = (asset: GraphicAsset, denomAssets: GraphicAsset[]) => {
    const idx = denomAssets.findIndex((a) => a.id === asset.id);
    setLightboxIndex(idx);
    setLightboxAsset(asset);
  };

  const navigateLightbox = (direction: -1 | 1, denomAssets: GraphicAsset[]) => {
    const next = lightboxIndex + direction;
    if (next < 0 || next >= denomAssets.length) return;
    setLightboxIndex(next);
    setLightboxAsset(denomAssets[next]);
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
    if (!uploadFile || !uploadDenom) { toast.error("Please select a file and denomination."); return; }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("denominationCluster", uploadDenom);
      form.append("role", uploadRole);
      const res = await fetch("/api/superuser/asset", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Asset uploaded.");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadDenom("");
      loadAssets();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const totalApproved = assets.filter((a) => a.approved).length;
  const totalPending = assets.filter((a) => !a.approved).length;

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
                  <Label>Denomination Cluster</Label>
                  <Select value={uploadDenom} onValueChange={setUploadDenom}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select cluster..." /></SelectTrigger>
                    <SelectContent>
                      {(denomClusters.length > 0 ? denomClusters : PREFERRED_ORDER).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Asset Role</Label>
                  <Select value={uploadRole} onValueChange={setUploadRole}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {uploadFile && <p className="text-sm text-muted-foreground">Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleUpload} disabled={isUploading || !uploadFile || !uploadDenom}>
                  {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-3"><CardContent className="px-4 py-0"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{assets.length}</p></CardContent></Card>
        <Card className="py-3"><CardContent className="px-4 py-0"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{totalApproved}</p></CardContent></Card>
        <Card className="py-3"><CardContent className="px-4 py-0"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{totalPending}</p></CardContent></Card>
      </div>

      {/* Denomination Tabs */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="__all__">
          <TabsList className="w-full justify-start mb-4 h-auto flex-wrap gap-1">
            <TabsTrigger value="__all__" className="gap-2">
              All
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {grouped.__all__.length}
              </span>
            </TabsTrigger>
            {denomClusters.map((denom) => (
              <TabsTrigger key={denom} value={denom} className="gap-2">
                {denom}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {grouped[denom]?.length ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {["__all__", ...denomClusters].map((denom) => {
            const denomAssets = grouped[denom] ?? [];
            const label = denom === "__all__" ? "any denomination" : denom;
            return (
              <TabsContent key={denom} value={denom}>
                {denomAssets.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground border rounded-lg">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No {approvedFilter !== "all" ? approvedFilter : ""} assets for {label}.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {denomAssets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => openLightbox(asset, denomAssets)}
                        className="group relative rounded-lg border overflow-hidden bg-muted text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="aspect-video relative">
                          <Image
                            src={asset.url}
                            alt={`${asset.denominationCluster} ${asset.role}`}
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
                            {denom === "__all__" ? `${asset.denominationCluster} · ` : ""}{asset.styleVersion}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Lightbox */}
      {lightboxAsset && (() => {
        const denomAssets = grouped[lightboxAsset.denominationCluster] ?? [];
        return (
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
                <span className="text-sm text-white/60">{lightboxAsset.denominationCluster} · {lightboxAsset.role} · {lightboxAsset.styleVersion}</span>
                <span className="text-sm text-white/40">{lightboxIndex + 1} / {denomAssets.length}</span>
              </div>
              <button onClick={() => setLightboxAsset(null)} className="p-1 rounded hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image + nav */}
            <div className="flex-1 flex items-center justify-center relative min-h-0 px-16">
              <button
                onClick={() => navigateLightbox(-1, denomAssets)}
                disabled={lightboxIndex === 0}
                className="absolute left-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div className="relative w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={lightboxAsset.url}
                  alt={lightboxAsset.denominationCluster}
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>

              <button
                onClick={() => navigateLightbox(1, denomAssets)}
                disabled={lightboxIndex === denomAssets.length - 1}
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
                {lightboxAsset.approved ? <><XCircle className="h-4 w-4 mr-2" />Unapprove</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Approve</>}
              </Button>
              <Button
                variant="destructive"
                onClick={() => { setPendingDelete(lightboxAsset); setLightboxAsset(null); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>

            {/* Thumbnail strip */}
            {denomAssets.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-4 shrink-0 justify-center">
                {denomAssets.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => { setLightboxIndex(i); setLightboxAsset(a); }}
                    className={`relative h-14 w-24 rounded shrink-0 overflow-hidden border-2 transition-all ${i === lightboxIndex ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}
                  >
                    <Image src={a.url} alt="" fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
