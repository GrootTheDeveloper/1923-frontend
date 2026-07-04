export const emptyJobForm = {
  title: "",
  company: "",
  level: "Junior",
  raw_text: "",
};

export const emptyCvForm = {
  candidate_name: "",
  email: "",
  phone: "",
  links: "",
  skills: "",
  education: "",
  experience: "",
  projects: "",
  certifications: "",
  languages: "",
  summary: "",
};

export const statusOptions = ["New", "Reviewed", "Shortlisted", "Rejected"];
export const requirementTypes = ["skill", "experience", "project", "education", "language", "certification", "soft_skill", "domain"];
export const requirementPriorities = ["required", "preferred", "bonus"];

export const statusMap = {
  New: "Mới",
  Reviewed: "Đã đánh giá",
  Shortlisted: "Phù hợp (Shortlist)",
  Rejected: "Từ chối",
};

export const typeMap = {
  skill: "Kỹ năng",
  experience: "Kinh nghiệm",
  project: "Dự án",
  education: "Học vấn",
  language: "Ngoại ngữ",
  certification: "Chứng chỉ",
  soft_skill: "Kỹ năng mềm",
  domain: "Lĩnh vực",
};

export const priorityMap = {
  required: "Bắt buộc",
  preferred: "Ưu tiên",
  bonus: "Điểm cộng",
};

export const matchLevelMap = {
  "Strong match": "Khớp mạnh",
  "Good match": "Khớp tốt",
  "Partial match": "Khớp một phần",
  "Weak match": "Khớp yếu",
};