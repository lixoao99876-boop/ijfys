import PageHeader from "@/components/admin/PageHeader";
import CollectionEditor from "./CollectionEditor";
import { fetchCollectionDetail } from "@/lib/admin/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detail;
  try {
    detail = await fetchCollectionDetail(id);
  } catch {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={`专题：${detail.title}`}
        description={`/collection/${detail.slug}`}
        breadcrumb={["内容管理", "专题合集", detail.title]}
      />
      <CollectionEditor initial={detail} />
    </div>
  );
}
