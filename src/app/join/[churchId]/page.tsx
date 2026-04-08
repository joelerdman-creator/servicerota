import { notFound } from "next/navigation";
import { firestore } from "@/firebase/admin-app";
import JoinForm from "./JoinForm";

interface PageProps {
  params: Promise<{ churchId: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { churchId } = await params;

  if (!firestore) notFound();

  // Fetch church profile
  const churchSnap = await firestore.collection("churches").doc(churchId).get();
  if (!churchSnap.exists) notFound();

  const church = churchSnap.data() as {
    name: string;
    logoUrl?: string;
    primaryColor?: string;
  };

  // Fetch role templates (server-side bypasses security rules)
  const rolesSnap = await firestore
    .collection(`churches/${churchId}/role_templates`)
    .orderBy("name")
    .get();

  const roles = rolesSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name as string,
  }));

  return (
    <JoinForm
      churchId={churchId}
      churchName={church.name}
      logoUrl={church.logoUrl}
      primaryColor={church.primaryColor}
      roles={roles}
    />
  );
}
