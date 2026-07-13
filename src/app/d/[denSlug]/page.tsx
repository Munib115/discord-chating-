import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    denSlug: string;
  }>;
}

export default async function DenIndexPage({ params }: PageProps) {
  const resolvedParams = await params;
  redirect(`/d/${resolvedParams.denSlug}/general`);
}
