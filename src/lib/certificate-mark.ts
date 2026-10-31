export type CertificateMark = "valid" | "expired" | "unverified" | "none";

type CertificateStatus = "VERIFIED" | "UNVERIFIED" | "EXPIRED";
type DataType = "REAL" | "DEMO";

export function certificateMark(status: CertificateStatus | null, dataType: DataType): CertificateMark {
  if (status == null) return "none";
  if (status === "EXPIRED") return "expired";
  if (status === "VERIFIED" && dataType === "REAL") return "valid";
  return "unverified";
}

export function supplierCertificateMark(supplier: {
  dataType: DataType;
  certifications: Array<{ status: CertificateStatus }>;
}): CertificateMark {
  if (supplier.certifications.length === 0) return "none";
  const marks = supplier.certifications.map((item) => certificateMark(item.status, supplier.dataType));
  if (marks.some((mark) => mark === "unverified")) return "unverified";
  if (marks.some((mark) => mark === "expired")) return "expired";
  if (marks.some((mark) => mark === "valid")) return "valid";
  return "none";
}
