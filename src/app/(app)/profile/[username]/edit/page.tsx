import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { EditProfileForm } from "@/components/EditProfileForm";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await requireUser();
  if (user.username !== username) notFound();

  return <EditProfileForm user={user} />;
}
