import { Handover } from "@/components/handover";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [{ id }, { kind }] = await Promise.all([params, searchParams]);
  return <Handover id={id} incident={kind === "incident"} />;
}
