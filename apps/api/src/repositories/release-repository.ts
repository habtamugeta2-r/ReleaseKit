import type { Prisma, Release } from "@prisma/client";

export interface ReleaseListOptions {
  skip: number;
  take: number;
  status?: Release["status"];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy: "createdAt" | "updatedAt" | "name" | "version" | "status";
  sortOrder: "asc" | "desc";
}

export interface ReleaseRepository {
  list(
    options: ReleaseListOptions,
  ): Promise<{ items: Release[]; total: number }>;
  findById(id: string): Promise<Release | null>;
  hasAssets(releaseId: string): Promise<boolean>;
  create(data: Prisma.ReleaseCreateInput): Promise<Release>;
  update(id: string, data: Prisma.ReleaseUpdateInput): Promise<Release>;
  delete(id: string): Promise<void>;
}

export class PrismaReleaseRepository implements ReleaseRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  async list(
    options: ReleaseListOptions,
  ): Promise<{ items: Release[]; total: number }> {
    const where: Prisma.ReleaseWhereInput = {
      ...(options.status ? { status: options.status } : {}),
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: "insensitive" } },
              { version: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(options.createdAfter || options.createdBefore
        ? {
            createdAt: {
              ...(options.createdAfter ? { gte: options.createdAfter } : {}),
              ...(options.createdBefore ? { lte: options.createdBefore } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.release.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: [
          { [options.sortBy]: options.sortOrder },
          { id: options.sortOrder },
        ],
      }),
      this.prisma.release.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<Release | null> {
    return this.prisma.release.findUnique({ where: { id } });
  }

  async hasAssets(releaseId: string): Promise<boolean> {
    return (await this.prisma.releaseAsset.count({ where: { releaseId } })) > 0;
  }

  create(data: Prisma.ReleaseCreateInput): Promise<Release> {
    return this.prisma.release.create({ data });
  }

  async update(id: string, data: Prisma.ReleaseUpdateInput): Promise<Release> {
    return this.prisma.release.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.release.delete({ where: { id } });
  }
}
