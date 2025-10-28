/**
 * Mapping functions from JavaScript frontend
 * Used for converting between different data formats
 */

/**
 * Maps acne classification to API format
 * @param {string} classification - Classification string
 * @returns {string} API format acne type
 */
function mapClassificationToAcneType(classification) {
  if (!classification) return "no_acne";
  const cls = classification.toLowerCase();
  switch (cls) {
    case "cistica":
      return "cystic";
    case "comedonica":
      return "comedonic";
    case "microcistica":
      return "microcystic";
    case "no-acne":
      return "no_acne";
    case "nodulo-cistica":
      return "nodulocystic";
    case "papulopustolosa":
      return "papulopustular";
    default:
      return "no_acne";
  }
}

/**
 * Maps severity to lowercase level
 * @param {string} severity - Severity string
 * @returns {string} Lowercase severity
 */
function mapSeverityToLevel(severity) {
  if (!severity) return "mild";
  const sev = severity.toLowerCase();
  if (sev === "mild") return "mild";
  if (sev === "moderate") return "moderate";
  if (sev === "severe") return "severe";
  if (sev === "none") return "none";
  return "mild";
}

/**
 * Maps age range to birthdate
 * @param {string} ageRange - Age range label
 * @returns {string} Birthdate in YYYY-MM-DD format
 */
function mapAgeRangeToBirthdate(ageRange) {
  if (!ageRange) return "2000-01-01";
  const label = ageRange.toLowerCase();
  
  if (label.includes("17") || label.includes("meno")) {
    return "2008-01-01";
  } else if (label.includes("18") && label.includes("25")) {
    return "1998-01-01";
  } else if (label.includes("26") && label.includes("35")) {
    return "1990-01-01";
  } else if (label.includes("36") && label.includes("45")) {
    return "1982-01-01";
  } else if (label.includes("45") || label.includes("più")) {
    return "1970-01-01";
  }
  return "2000-01-01";
}

/**
 * Maps gender label to API format
 * @param {string} gender - Gender label
 * @returns {string} API format gender
 */
function mapGender(gender) {
  if (!gender) return "non_binary";
  const label = gender.toLowerCase();
  if (label === "maschio" || label === "male") return "male";
  if (label === "femmina" || label === "female") return "female";
  return "non_binary";
}

/**
 * Maps budget label to level
 * @param {string} budget - Budget label
 * @returns {string} Budget level
 */
function mapBudget(budget) {
  if (!budget) return "Medium";
  const label = budget.toLowerCase();
  if (label.includes("alto")) return "High";
  if (label.includes("basso")) return "Low";
  if (label.includes("medio")) return "Medium";
  return "Medium";
}

module.exports = {
  mapClassificationToAcneType,
  mapSeverityToLevel,
  mapAgeRangeToBirthdate,
  mapGender,
  mapBudget
};

