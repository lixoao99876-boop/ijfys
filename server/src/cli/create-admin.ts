/**
 * 创建/升级超级管理员账号。密码经 bcrypt 哈希入库，明文不落仓库。
 * 用法（VPS 上）：
 *   ADMIN_USERNAME=lixiao ADMIN_PASSWORD='***' ADMIN_ROLE=SUPER_ADMIN \
 *     node dist/cli/create-admin.js
 * 已存在同名用户则升级其角色并（可选）重置密码。
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const username = (process.env.ADMIN_USERNAME ?? process.argv[2] ?? "").trim();
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3] ?? "";
  const role = (process.env.ADMIN_ROLE ?? "SUPER_ADMIN") as UserRole;

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new Error("用户名 3-20 位字母/数字/下划线");
  if (!password || password.length < 6) throw new Error("密码至少 6 位");
  if (!Object.values(UserRole).includes(role)) throw new Error(`非法角色 ${role}`);

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      await prisma.user.update({
        where: { username },
        data: { role, passwordHash, isBanned: false },
      });
      console.log(`✓ 已更新用户 "${username}" → role=${role}（密码已重置）`);
    } else {
      await prisma.user.create({
        data: { username, passwordHash, role, nickname: username },
      });
      console.log(`✓ 已创建超管 "${username}" role=${role}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("创建失败:", e instanceof Error ? e.message : e);
  process.exit(1);
});
