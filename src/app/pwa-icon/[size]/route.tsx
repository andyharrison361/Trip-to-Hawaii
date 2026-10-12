import { brandIcon } from "@/lib/brand-icon";

const SIZES = ["192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_request: Request, { params }: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await params;
  return brandIcon(SIZES.includes(size) ? Number(size) : 512);
}
