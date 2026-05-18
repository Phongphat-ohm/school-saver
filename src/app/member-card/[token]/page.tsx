import { notFound } from "next/navigation";
import { getMemberCardWorkspaceAction } from "@/features/member-card/actions";
import { PublicMemberCard } from "@/features/member-card/components/PublicMemberCard";

export default async function MemberCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getMemberCardWorkspaceAction(token);
  if (!result.success) notFound();

  return <PublicMemberCard token={token} workspace={result.data} />;
}
