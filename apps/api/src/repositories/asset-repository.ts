import type { Prisma, PrismaClient, ReleaseAsset } from "@prisma/client";

export type NewReleaseAsset = Pick<
  ReleaseAsset,
  "releaseId" | "objectKey" | "fileName" | "contentType" | "sizeBytes"
>;

export type ReleaseAssetMetadata = Pick<
  ReleaseAsset,
  "id" | "fileName" | "contentType" | "sizeBytes" | "createdAt"
>;

export interface AssetRepository {
  releaseExists(releaseId: string): Promise<boolean>;
  create(data: NewReleaseAsset): Promise<ReleaseAsset>;
  listForRelease(releaseId: string): Promise<ReleaseAssetMetadata[]>;
  findForRelease(
    releaseId: string,
    assetId: string,
  ): Promise<ReleaseAsset | null>;
  delete(assetId: string): Promise<void>;
}

export class PrismaAssetRepository implements AssetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async releaseExists(releaseId: string): Promise<boolean> {
    return (
      (await this.prisma.release.findUnique({
        where: { id: releaseId },
        select: { id: true },
      })) !== null
    );
  }

  create(data: NewReleaseAsset): Promise<ReleaseAsset> {
    const createData = {
      release: { connect: { id: data.releaseId } },
      objectKey: data.objectKey,
      fileName: data.fileName,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
    } satisfies Prisma.ReleaseAssetCreateInput;
    return this.prisma.releaseAsset.create({ data: createData });
  }

  listForRelease(releaseId: string): Promise<ReleaseAssetMetadata[]> {
    return this.prisma.releaseAsset.findMany({
      where: { releaseId },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        sizeBytes: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }

  findForRelease(
    releaseId: string,
    assetId: string,
  ): Promise<ReleaseAsset | null> {
    return this.prisma.releaseAsset.findFirst({
      where: { id: assetId, releaseId },
    });
  }

  async delete(assetId: string): Promise<void> {
    await this.prisma.releaseAsset.delete({ where: { id: assetId } });
  }
}
