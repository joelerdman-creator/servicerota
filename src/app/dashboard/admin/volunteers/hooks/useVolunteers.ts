import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useFirestore, WithId } from "@/firebase";
import toast from "react-hot-toast";
import { Volunteer } from "../types";

export const PAGE_SIZE = 10;

export function useVolunteers(churchId: string | undefined) {
  const firestore = useFirestore();
  const [allVolunteers, setAllVolunteers] = useState<WithId<Volunteer>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);

  const fetchAllVolunteers = async () => {
    if (!firestore || !churchId) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(firestore, "users"),
        where("churchId", "==", churchId),
        orderBy("lastName"),
        orderBy("firstName")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithId<Volunteer>));
      setAllVolunteers(data);
    } catch (e) {
      console.error("Error fetching volunteers:", e);
      toast.error("Could not fetch volunteers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllVolunteers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, firestore]);

  // Derived state
  const filteredVolunteers = useMemo(() => {
    return allVolunteers.filter((v) => {
      // 1. Search term (case insensitive substring match)
      if (searchTerm) {
        const full = `${v.firstName || ""} ${v.lastName || ""}`.toLowerCase();
        if (!full.includes(searchTerm.toLowerCase())) return false;
      }
      // 2. Role filter
      if (filterRole !== "all") {
        if (!v.availableRoleIds?.includes(filterRole)) return false;
      }
      // 3. Service filter
      if (filterService !== "all") {
        if (!v.availableRecurringEventSeriesIds?.includes(filterService)) return false;
      }
      return true;
    });
  }, [allVolunteers, searchTerm, filterRole, filterService]);

  const totalPages = Math.ceil(filteredVolunteers.length / PAGE_SIZE) || 1;
  
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const paginatedVolunteers = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredVolunteers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredVolunteers, page]);

  const handleNextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const handlePrevPage = () => setPage((p) => Math.max(p - 1, 1));
  const resetPage = () => setPage(1);

  // When filters change, reset to page 1
  useEffect(() => {
    resetPage();
  }, [searchTerm, filterRole, filterService]);

  return {
    volunteers: paginatedVolunteers,
    allVolunteers,
    isLoading,
    searchTerm,
    setSearchTerm,
    filterRole,
    setFilterRole,
    filterService,
    setFilterService,
    page,
    totalPages,
    handleNextPage,
    handlePrevPage,
    totalCount: allVolunteers.length,
    filteredCount: filteredVolunteers.length,
    refresh: fetchAllVolunteers,
  };
}
