import PageHeader from "@/components/admin/PageHeader";
import { FormSection, Field, Input, Textarea, Toggle } from "@/components/admin/Form";
import { SITE_HOST, SITE_NAME } from "@/lib/site";

export default function AdminSiteSettingsPage() {
  return (
    <div>
      <PageHeader
        title="网站设置"
        description="站点基础配置：名称、Logo、ICP、备案、客服联络等"
        breadcrumb={["系统设置", "网站设置"]}
        actions={
          <button className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 text-sm cursor-not-allowed opacity-70" disabled>
            保存
          </button>
        }
      />

      <FormSection title="基础信息" description="影响所有页面 head 与底部展示">
        <Field label="网站名称">
          <Input value={SITE_NAME} />
        </Field>
        <Field label="域名">
          <Input value={SITE_HOST} />
        </Field>
        <Field label="网站标语" hint="显示于首页 Hero 区与浏览器标题">
          <Input value="高清在线影视聚合" />
        </Field>
        <Field label="网站描述" hint="≤ 160 字">
          <Textarea value={`${SITE_NAME}：电影、剧集、综艺、动漫、短剧高清在线观看。`} />
        </Field>
        <Field label="Logo URL">
          <Input value="/favicon.svg" />
        </Field>
      </FormSection>

      <FormSection title="访问控制">
        <Field label="允许搜索引擎收录">
          <Toggle value={true} label="开启" />
        </Field>
        <Field label="访客必须登录">
          <Toggle value={false} label="关闭" />
        </Field>
        <Field label="维护模式">
          <Toggle value={false} label="关闭" />
        </Field>
      </FormSection>

      <FormSection title="备案与法务" description="底部展示，符合国内合规要求">
        <Field label="ICP 备案">
          <Input placeholder="例如 京ICP备 12345678 号" />
        </Field>
        <Field label="公安备案">
          <Input placeholder="例如 京公网安备 11010102000001 号" />
        </Field>
        <Field label="客服邮箱">
          <Input placeholder={`contact@${SITE_HOST}`} />
        </Field>
      </FormSection>

      <p className="text-[11px] text-muted/70">
        提示：业务接入阶段会落库到 site_settings 单行表，保存按钮调用 PUT /api/admin/settings/site。
      </p>
    </div>
  );
}
