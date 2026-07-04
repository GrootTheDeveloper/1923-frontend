export function splitList(value) {
  return value
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function multiline(value) {
  return Array.isArray(value) ? value.join("\n") : value || "";
}

export function toCvForm(data) {
  return {
    candidate_name: data.candidate_name || "",
    email: data.email || "",
    phone: data.phone || "",
    links: (data.links || []).join(", "),
    skills: (data.skills || []).join(", "),
    education: multiline(data.education),
    experience: multiline(data.experience),
    projects: multiline(data.projects),
    certifications: multiline(data.certifications),
    languages: (data.languages || []).join(", "),
    summary: data.summary || "",
  };
}

export function fromCvForm(form) {
  return {
    candidate_name: form.candidate_name,
    email: form.email,
    phone: form.phone,
    links: splitList(form.links),
    skills: splitList(form.skills),
    education: splitList(form.education),
    experience: splitList(form.experience),
    projects: splitList(form.projects),
    certifications: splitList(form.certifications),
    languages: splitList(form.languages),
    summary: form.summary,
  };
}

export function toRequirementsDraft(job) {
  const config = job?.requirements_config?.length
    ? job.requirements_config
    : [
        ...(job?.required_skills || []).map((skill) => ({ name: skill, type: "skill", priority: "required", weight: 10, is_knockout: true })),
        ...(job?.preferred_skills || []).map((skill) => ({ name: skill, type: "skill", priority: "preferred", weight: 5, is_knockout: false })),
      ];

  return config.map((item) => ({
    name: item.name || "",
    type: item.type || "skill",
    priority: item.priority || "preferred",
    weight: Number(item.weight || 5),
    is_knockout: Boolean(item.is_knockout),
  }));
}

export function normalizeRequirementDraft(item) {
  return {
    name: item.name.trim(),
    type: item.type || "skill",
    priority: item.priority || "preferred",
    weight: Math.max(1, Math.min(Number(item.weight || 1), 20)),
    is_knockout: Boolean(item.is_knockout),
  };
}

export function averageScore(matches) {
  if (!matches.length) return "--";
  const total = matches.reduce((sum, match) => sum + Number(match.final_score || 0), 0);
  return `${Math.round(total / matches.length)}%`;
}

export function formatBreakdownLabel(key) {
  const labels = {
    requirement_score: "Điểm yêu cầu",
    skill_score: "Điểm kỹ năng",
    experience_project_score: "Điểm kinh nghiệm & dự án",
    education_language_certification_score: "Điểm học vấn/ngoại ngữ/chứng chỉ",
    completeness_score: "Độ đầy đủ hồ sơ",
    penalty_score: "Điểm phạt (Knockout)",
  };
  return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatExtractionMethod(method) {
  if (method === "gemini") return "AI (Gemini)";
  if (method === "rule_based_fallback") return "Dự phòng (Quy tắc)";
  return "Quy tắc";
}

export function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function readError(error, fallback) {
  return error?.response?.data?.detail || fallback;
}