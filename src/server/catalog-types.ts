import type {
  CertificationStatus,
  ContactStatus,
  ContactType,
  DataType,
  SourceType,
  SupplierType,
  VerificationStatus,
} from "@/generated/prisma/client";

export type CatalogProduct = {
  id: string;
  name: string;
  categorySlug: string;
  categoryNameRu: string;
  categoryNameEn: string;
  price: number | null;
  currency: string;
  moq: number | null;
  unit: string | null;
  deliveryNotes: string | null;
  priceUpdatedAt: string | null;
};

export type CatalogCertification = {
  id: string;
  name: string;
  documentUrl: string | null;
  sourceUrl: string | null;
  issuer: string | null;
  status: CertificationStatus;
  expiresAt: string | null;
  verificationNotes: string | null;
};

export type CatalogContact = {
  id: string;
  type: ContactType;
  label: string | null;
  value: string;
};

export type CatalogSource = {
  id: string;
  sourceType: SourceType;
  url: string;
  title: string | null;
  evidence: string | null;
};

export type CatalogSupplier = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  supplierType: SupplierType;
  city: string | null;
  region: string | null;
  country: string;
  address: string | null;
  website: string | null;
  sourceUrl: string | null;
  dataType: DataType;
  verificationStatus: VerificationStatus;
  createdAt: string;
  products: CatalogProduct[];
  contacts: CatalogContact[];
  certifications: CatalogCertification[];
  sources: CatalogSource[];
  minPrice: number | null;
  minMoq: number | null;
};

export type WorkspaceNote = {
  id: string;
  supplierId: string;
  content: string;
  updatedAt: string;
};

export type WorkspaceEntry = {
  supplierId: string;
  contactStatus: ContactStatus;
  notes: WorkspaceNote[];
};

export class DataError extends Error {
  constructor() {
    super("The catalog could not be loaded.");
    this.name = "DataError";
  }
}
