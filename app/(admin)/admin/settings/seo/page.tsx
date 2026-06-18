import PageHeader from "@/components/admin/PageHeader";
import { FormSection, Field, Input, Textarea, Toggle } from "@/components/admin/Form";

export default function AdminSeoSettingsPage() {
  return (
    <div>
      <PageHeader
        title="SEO 设置"
        description="搜索引擎可见性 + meta 标签 + sitemap + robots"
        breadcrumb={["系统设置", "SEO 设置"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            保存
          </button>
        }
      />

      <FormSection title="首页 Meta" description="未填写时回退到网站设置中的标题与描述">
        <Field label="Title 模板" hint="支持 {{title}} 占位">
          <Input value="{{title}} - 飓风影视 ijfys.com" />
        </Field>
        <Field label="Description">
          <Textarea value="飓风影视：电影、剧集、综艺、动漫、短剧高清在线观看，每日更新。" />
        </Field>
        <Field label="Keywords">
          <Input value="影视, 在线观看, 电影, 电视剧, 综艺, 动漫" />
        </Field>
      </FormSection>

      <FormSection title="索引控制">
        <Field label="启用 sitemap.xml">
          <Toggle value={true} label="开启" />
        </Field>
        <Field label="启用 robots.txt">
          <Toggle value={true} label="开启" />
        </Field>
        <Field label="启用结构化数据 (JSON-LD)">
          <Toggle value={true} label="开启" />
        </Field>
        <Field label="允许 OG / Twitter 卡片">
          <Toggle value={true} label="开启" />
        </Field>
      </FormSection>

      <FormSection title="第三方验证">
        <Field label="Google Search Console" hint="验证 meta">
          <Input placeholder="例如 google-site-verification=xxxx" />
        </Field>
        <Field label="百度站长" hint="百度验证 meta">
          <Input placeholder="例如 baidu-site-verification: code-xxx" />
        </Field>
        <Field label="Bing IndexNow Key">
          <Input placeholder="64 位十六进制 key" />
        </Field>
      </FormSection>

      <p className="text-[11px] text-muted/70">
        💡 业务接入后：sitemap 走 /sitemap.xml 动态生成，覆盖 videos/categories/actors；
        OG / JSON-LD 由 generateMetadata 注入。
      </p>
    </div>
  );
}
