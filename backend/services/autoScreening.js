// backend/services/autoScreening.js

/**
 * Executes the auto-screening logic for a single applicant.
 * @param {object[]} jobCustomFields - The custom fields and criteria from the job.
 * @param {object} applicantAnswers - The applicant's custom answers.
 * @returns {{status: string, log: object}} The screening result.
 */
export function runAutoScreening(jobCustomFields, applicantAnswers) {
  let screeningResult = true;
  const logMessage = {
    "Lolos": [],
    "Tidak Lolos": [],
    "Review": []
  };

  if (!jobCustomFields || jobCustomFields.length === 0) {
    return {
      status: 'Lolos',
      log: {
        "Lolos": ["Tidak ada kriteria untuk dicek"],
        "Tidak Lolos": []
      }
    };
  }

  for (const criteriaItem of jobCustomFields) {
    const label = criteriaItem.label;
    const criteria = criteriaItem.criteria;
    const criteriaType = criteriaItem.type;
    const required = criteriaItem.required;
    const applicantAnswer = applicantAnswers[label];

    if (required && !applicantAnswer) {
      screeningResult = false;
      logMessage["Tidak Lolos"].push({
        reason: `Jawaban untuk ${label} tidak ditemukan.`
      });
      continue;
    }

    if (!applicantAnswer) {
      continue; // Skip optional fields with no answer
    }

    if (criteriaType === 'number') {
      const applicantValue = parseFloat(applicantAnswer);
      let criteriaValue;
      let operator = '=';

      if (criteria.includes('>=')) {
        operator = '>=';
        criteriaValue = parseFloat(criteria.replace(/[<>=! ]/g, ''));
      } else if (criteria.includes('>')) {
        operator = '>';
        criteriaValue = parseFloat(criteria.replace(/[<>=! ]/g, ''));
      } else if (criteria.includes('<=')) {
        operator = '<=';
        criteriaValue = parseFloat(criteria.replace(/[<>=! ]/g, ''));
      } else if (criteria.includes('<')) {
        operator = '<';
        criteriaValue = parseFloat(criteria.replace(/[<>=! ]/g, ''));
      } else {
        criteriaValue = parseFloat(criteria);
      }

      let isMatch = false;
      switch (operator) {
        case '>=':
          isMatch = applicantValue >= criteriaValue;
          break;
        case '>':
          isMatch = applicantValue > criteriaValue;
          break;
        case '<=':
          isMatch = applicantValue <= criteriaValue;
          break;
        case '<':
          isMatch = applicantValue < criteriaValue;
          break;
        case '=':
          isMatch = applicantValue === criteriaValue;
          break;
      }

      if (!isMatch) {
        screeningResult = false;
        logMessage["Tidak Lolos"].push({
          reason: `Jawaban ${applicantAnswer} untuk ${label} tidak memenuhi syarat ${criteria}.`
        });
      }
    } else if (criteriaType === 'text') {
      const cleanedCriteria = criteria.split(',').map(s => s.trim().toLowerCase());
      const cleanedAnswer = applicantAnswer.trim().toLowerCase();

      let isMatch = false;
      if (cleanedCriteria.length > 1) {
        isMatch = cleanedCriteria.includes(cleanedAnswer);
      } else {
        isMatch = cleanedAnswer === cleanedCriteria[0];
      }

      if (!isMatch) {
        screeningResult = false;
        logMessage["Tidak Lolos"].push({
          reason: `Jawaban ${applicantAnswer} untuk ${label} tidak ada di daftar yang diizinkan.`
        });
      }
    }
  }

  const status = screeningResult ? 'Lolos' : 'Tidak Lolos';
  
  return {
    status: status,
    log: logMessage
  };
}