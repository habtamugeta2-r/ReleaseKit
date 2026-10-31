import type { Prisma, Release } from "@prisma/client";
import { AppError } from "../errors";
import type {
  ReleaseListOptions,
  ReleaseRepository,
} from "../repositories/release-repository";

export class ReleaseService {
  constructor(private readonly repository: ReleaseRepository) {}

  list(
    page: number,
    pageSize: number,
    filters: Omit<ReleaseListOptions, "skip" | "take">,
  ): Promise<{ items: Release[]; total: number }> {
    return this.repository.list({
      ...filters,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async get(id: string): Promise<Release> {
    const release = await this.repository.findById(id);
    if (!release) {
      throw new AppError(404, "RELEASE_NOT_FOUND", "Release not found");
    }
    return release;
  }

  create(input: Prisma.ReleaseCreateInput): Promise<Release> {
    return this.repository.create(input);
  }

  async update(id: string, input: Prisma.ReleaseUpdateInput): Promise<Release> {
    await this.get(id);
    return this.repository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    if (await this.repository.hasAssets(id)) {
      throw new AppError(
        409,
        "RELEASE_HAS_ASSETS",
        "Delete release assets before deleting the release",
      );
    }
    await this.repository.delete(id);
  }
}
