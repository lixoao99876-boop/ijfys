import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Prisma, SitePageKind } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** footer 固定系统页（资讯类，可改内容不可删） */
const SYSTEM_PAGES: Array<{ slug: string; title: string; body: string; order: number }> = [
  {
    slug: "about",
    title: "关于本站",
    order: 0,
    body: `# 关于 51爱播\n\n51爱播是一个高清影视聚合与在线观看平台，致力于为中文用户提供可搜索、可分类、可连看的高清影视在线观看服务。\n\n## 我们提供什么\n\n- 海量影视资源：电影、电视剧、综艺、动漫、短剧等全品类内容。\n- AI短剧特色栏目：聚合全站 AI 生成短剧，涵盖修仙、玄幻、爽文、穿越等热门题材。\n- 便捷的观看体验：多线路高清播放、站内搜索、收藏与观看历史、每日更新、免费观看。\n\n## 关于内容\n\n本站为影视信息聚合与检索平台，站内展示的播放线路均来自第三方公开资源，本站不存储、不上传、不制作任何视频内容。所有内容版权归原作者及版权方所有。\n\n## 特别说明\n\n51爱播是独立的影视在线观看平台，与"影视飓风 / MediaStorm"（一个视频内容创作团队）无任何关联。\n\n如有任何问题或版权相关事宜，请通过「联系我们」与我们取得联系。`,
  },
  {
    slug: "faq",
    title: "常见问题解答",
    order: 1,
    body: `# 常见问题解答（FAQ）\n\n**问：本站的视频需要付费吗？**\n本站内容均可免费在线观看，部分权益（如去广告）可通过会员获得。\n\n**问：为什么有的视频加载较慢或无法播放？**\n播放线路来自第三方，偶有波动。可尝试切换线路，或稍后再试。\n\n**问：如何收藏和记录观看进度？**\n注册登录后即可使用收藏夹与观看历史，并在多设备间同步。\n\n**问：找不到想看的影片怎么办？**\n可使用顶部搜索，或通过「联系我们」向我们反馈。`,
  },
  {
    slug: "contact",
    title: "联系我们",
    order: 2,
    body: `# 联系我们\n\n感谢你使用 51爱播。如你有任何问题、建议或版权相关事宜，欢迎通过以下方式联系我们：\n\n- 邮箱：aiskill88@gmail.com\n- 工作时间：周一至周日 10:00–22:00\n\n我们会尽快回复你的来信。`,
  },
  {
    slug: "privacy",
    title: "隐私与政策",
    order: 3,
    body: `# 隐私与政策\n\n我们重视并保护你的个人隐私。本政策说明我们如何收集、使用与保护你的信息。\n\n## 我们收集的信息\n- 账号信息：用户名、邮箱（注册时提供）\n- 使用信息：观看历史、收藏、搜索记录等\n- 技术信息：访问日志、设备与浏览器信息\n\n## 信息的使用\n用于提供与改进服务、个性化推荐、保障账号安全。\n\n## 信息的保护\n我们采取合理的技术与管理措施保护你的数据，密码经加密存储。\n\n## Cookie\n我们使用 Cookie 维持登录状态与优化体验，你可在浏览器中管理。`,
  },
  {
    slug: "help",
    title: "帮助中心",
    order: 4,
    body: `# 帮助中心\n\n## 如何观看\n在首页或分类中选择影片，进入详情页点击「立即播放」即可在线观看，支持多线路切换。\n\n## 如何注册登录\n点击右上角「登录」，可使用用户名或邮箱注册并登录。\n\n## 收藏与历史\n登录后，在影片页可加入收藏；观看进度会自动记录在「观看历史」。\n\n## 反馈问题\n如遇播放异常或其他问题，请通过「联系我们」告知我们。`,
  },
  {
    slug: "legal",
    title: "法律声明",
    order: 5,
    body: `# 法律声明\n\n本站为影视信息聚合与检索服务平台，站内展示的视频播放线路均来自第三方公开采集接口，本站不存储、不上传、不制作任何视频内容。\n\n所有内容的版权归原作者及版权方所有。如你认为本站内容侵犯了你的合法权益，请通过「联系我们」向我们提供权属证明，我们将在核实后及时处理（包括下架相关内容）。\n\n本站不对第三方内容的准确性、合法性承担责任。`,
  },
  {
    slug: "terms",
    title: "使用条款",
    order: 6,
    body: `# 使用条款\n\n欢迎使用 51爱播。使用本站即表示你同意以下条款：\n\n## 服务使用\n你应遵守相关法律法规，不得利用本站从事任何违法或侵害他人权益的行为。\n\n## 账号责任\n你应妥善保管账号与密码，账号下的所有活动由你负责。\n\n## 内容与知识产权\n站内内容仅供个人学习与欣赏，不得用于商业用途或二次传播。\n\n## 服务变更\n我们可能不时更新服务与条款，更新后继续使用即视为接受。`,
  },
];

@Injectable()
export class SitePageService implements OnModuleInit {
  private readonly logger = new Logger(SitePageService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** 开机确保 footer 系统页存在（幂等：不存在才建，不覆盖已编辑内容） */
  async onModuleInit() {
    for (const p of SYSTEM_PAGES) {
      const exists = await this.prisma.sitePage.findUnique({ where: { slug: p.slug } });
      if (!exists) {
        await this.prisma.sitePage.create({
          data: { slug: p.slug, title: p.title, body: p.body, order: p.order, kind: "NEWS", isSystem: true },
        });
      }
    }
    this.logger.log("SitePage 系统页已就绪");
  }

  // ---------- 公开读 ----------
  async getPublicBySlug(slug: string) {
    const page = await this.prisma.sitePage.findFirst({ where: { slug, published: true } });
    if (!page) throw new NotFoundException("页面不存在");
    return page;
  }

  /** footer 固定链接（系统资讯页） */
  async footerLinks() {
    const rows = await this.prisma.sitePage.findMany({
      where: { kind: "NEWS", isSystem: true, published: true },
      orderBy: { order: "asc" },
      select: { slug: true, title: true },
    });
    return rows;
  }

  async listPublicAnnouncements() {
    return this.prisma.sitePage.findMany({
      where: { kind: "ANNOUNCEMENT", published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { slug: true, title: true, summary: true, updatedAt: true },
    });
  }

  // ---------- 后台 CRUD ----------
  listAdmin(kind: SitePageKind) {
    return this.prisma.sitePage.findMany({ where: { kind }, orderBy: [{ order: "asc" }, { updatedAt: "desc" }] });
  }

  getAdmin(id: string) {
    return this.prisma.sitePage.findUnique({ where: { id } });
  }

  async create(data: { slug: string; title: string; kind: SitePageKind; body: string; summary?: string; published?: boolean; order?: number }) {
    const slug = (data.slug ?? "").trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new BadRequestException("slug 需 2-40 位小写字母/数字/连字符");
    if (!data.title?.trim()) throw new BadRequestException("标题必填");
    const dup = await this.prisma.sitePage.findUnique({ where: { slug } });
    if (dup) throw new BadRequestException("slug 已存在");
    return this.prisma.sitePage.create({
      data: {
        slug,
        title: data.title.trim(),
        kind: data.kind,
        body: data.body ?? "",
        summary: data.summary || null,
        published: data.published ?? true,
        order: data.order ?? 0,
      },
    });
  }

  async update(id: string, data: { title?: string; body?: string; summary?: string | null; published?: boolean; order?: number }) {
    const page = await this.prisma.sitePage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("页面不存在");
    const patch: Prisma.SitePageUpdateInput = {};
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.body !== undefined) patch.body = data.body;
    if (data.summary !== undefined) patch.summary = data.summary || null;
    if (data.published !== undefined) patch.published = data.published;
    if (data.order !== undefined) patch.order = data.order;
    return this.prisma.sitePage.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    const page = await this.prisma.sitePage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("页面不存在");
    if (page.isSystem) throw new BadRequestException("系统页不可删除，只能编辑内容");
    await this.prisma.sitePage.delete({ where: { id } });
    return { ok: true };
  }
}
