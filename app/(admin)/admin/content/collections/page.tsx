import PageHeader from "@/components/admin/PageHeader";
import CollectionsTable from "./CollectionsTable";
import { fetchCollections } from "@/lib/admin/api";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const list = await fetchCollections();
  return (
    <div>
      <PageHeader
        title="专题合集"
        description="运营专题：创建后可被首页频道引用，或作为独立 /collection/:slug 页面"
        breadcrumb={["内容管理", "专题合集"]}
      />
      <CollectionsTable initial={list} />
    </div>
  );
}
