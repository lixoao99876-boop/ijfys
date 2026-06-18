import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";

const DEV_SECRET = "ijfys-dev-secret-change-in-prod";
const JWT_SECRET = process.env.JWT_SECRET ?? DEV_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? "7d";
const SALT_ROUNDS = 10;

// 生产环境强校验：JWT_SECRET 必须显式设置且足够长
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || JWT_SECRET === DEV_SECRET) {
    // eslint-disable-next-line no-console
    console.error("[FATAL] JWT_SECRET 未设置或为默认值，生产环境必须使用强随机密钥");
    process.exit(1);
  }
  if (JWT_SECRET.length < 32) {
    // eslint-disable-next-line no-console
    console.error("[FATAL] JWT_SECRET 长度不足 32 字符");
    process.exit(1);
  }
}

export interface JwtPayload {
  sub: string;     // userId
  username: string;
  role: string;
}

export interface AuthResult {
  token: string;
  user: { id: string; username: string; nickname: string | null; avatar: string | null; email: string | null; role: string };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(username: string, password: string, email?: string, nickname?: string): Promise<AuthResult> {
    const u = (username ?? "").trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) throw new BadRequestException("用户名 3-20 位字母/数字/下划线");
    if (!password || password.length < 6) throw new BadRequestException("密码至少 6 位");
    const exists = await this.prisma.user.findUnique({ where: { username: u } });
    if (exists) throw new BadRequestException("用户名已存在");
    if (email) {
      const eExists = await this.prisma.user.findUnique({ where: { email } });
      if (eExists) throw new BadRequestException("邮箱已被使用");
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        username: u,
        email: email || null,
        nickname: nickname || u,
        passwordHash,
      },
    });
    return this.tokenize(user);
  }

  async login(usernameOrEmail: string, password: string): Promise<AuthResult> {
    const key = (usernameOrEmail ?? "").trim();
    if (!key || !password) throw new BadRequestException("缺少参数");
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: key }, { email: key }] },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException("账号或密码错误");
    if (user.isBanned) throw new UnauthorizedException("账号已被禁用");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("账号或密码错误");
    return this.tokenize(user);
  }

  async getById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, nickname: true, avatar: true, role: true, isBanned: true },
    });
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  }

  private tokenize(user: { id: string; username: string; email: string | null; nickname: string | null; avatar: string | null; role: string }): AuthResult {
    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }
}
