// backend/services/autoScreening.js

/**
 * Preprocesses applicant answers to ensure correct data types
 * @param {object[]} jobCustomFields - The custom fields and criteria from the job
 * @param {object} rawAnswers - Raw applicant answers from frontend
 * @returns {object} Processed answers with correct data types
 */
export function preprocessAnswers(jobCustomFields, rawAnswers) {
  const processedAnswers = { ...rawAnswers };
  
  if (!jobCustomFields || !rawAnswers) {
    return processedAnswers;
  }
  
  // Convert answers based on field types
  jobCustomFields.forEach(field => {
    const label = field.label;
    const fieldType = field.type;
    const rawValue = rawAnswers[label];
    
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      if (fieldType === 'number') {
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
          processedAnswers[label] = numValue;
        }
      } else if (fieldType === 'text') {
        processedAnswers[label] = rawValue.toString().trim();
      }
    }
  });
  
  return processedAnswers;
}

/**
 * Executes the auto-screening logic for a single applicant
 * @param {object[]} jobCustomFields - The custom fields and criteria from the job
 * @param {object} applicantAnswers - The applicant's custom answers (already preprocessed)
 * @returns {{status: string, log: object}} The screening result
 */
export function runAutoScreening(jobCustomFields, applicantAnswers) {
  let screeningResult = true;
  const logMessage = {
    "Lolos": [],
    "Tidak Lolos": [],
    "Review": []
  };

  // Input validation
  if (!jobCustomFields || jobCustomFields.length === 0) {
    return {
      status: 'Lolos',
      log: {
        "Lolos": ["Tidak ada kriteria untuk dicek"],
        "Tidak Lolos": [],
        "Review": []
      }
    };
  }

  if (!applicantAnswers || typeof applicantAnswers !== 'object') {
    return {
      status: 'Tidak Lolos',
      log: {
        "Lolos": [],
        "Tidak Lolos": ["Data jawaban applicant tidak valid"],
        "Review": []
      }
    };
  }

  for (const criteriaItem of jobCustomFields) {
    const label = criteriaItem.label;
    const criteria = criteriaItem.criteria;
    const criteriaType = criteriaItem.type;
    const required = criteriaItem.required;
    const applicantAnswer = applicantAnswers[label];

    // Check required fields
    if (required && (applicantAnswer === undefined || applicantAnswer === null || applicantAnswer === '')) {
      screeningResult = false;
      logMessage["Tidak Lolos"].push({
        reason: `Jawaban untuk ${label} tidak ditemukan atau kosong.`
      });
      continue;
    }

    // Skip optional fields with no answer
    if (!applicantAnswer && applicantAnswer !== 0) {
      continue;
    }

    // Validate criteria exists
    if (!criteria || criteria.toString().trim() === '') {
      logMessage["Review"].push({
        reason: `Kriteria untuk ${label} tidak didefinisikan.`
      });
      continue;
    }

    if (criteriaType === 'number') {
      const result = evaluateNumberCriteria(applicantAnswer, criteria, label);
      
      if (result.status === 'error') {
        logMessage["Review"].push({
          reason: result.reason
        });
      } else if (result.status === 'pass') {
        logMessage["Lolos"].push({
          reason: result.reason
        });
      } else if (result.status === 'fail') {
        screeningResult = false;
        logMessage["Tidak Lolos"].push({
          reason: result.reason
        });
      }
      
    } else if (criteriaType === 'text') {
      const result = evaluateTextCriteria(applicantAnswer, criteria, label);
      
      if (result.status === 'pass') {
        logMessage["Lolos"].push({
          reason: result.reason
        });
      } else if (result.status === 'fail') {
        screeningResult = false;
        logMessage["Tidak Lolos"].push({
          reason: result.reason
        });
      }
    } else {
      // Unsupported criteria type
      logMessage["Review"].push({
        reason: `Tipe kriteria '${criteriaType}' untuk ${label} tidak didukung.`
      });
    }
  }

  const status = screeningResult ? 'Lolos' : 'Tidak Lolos';
  
  return {
    status: status,
    log: logMessage
  };
}

/**
 * Safe number comparison with floating point tolerance
 */
function safeNumberComparison(applicantValue, operator, criteriaValue) {
  const EPSILON = 0.000001; // tolerance untuk floating point
  
  switch (operator) {
    case '>=':
      return applicantValue > criteriaValue || Math.abs(applicantValue - criteriaValue) < EPSILON;
    case '>':
      return applicantValue > criteriaValue && Math.abs(applicantValue - criteriaValue) >= EPSILON;
    case '<=':
      return applicantValue < criteriaValue || Math.abs(applicantValue - criteriaValue) < EPSILON;
    case '<':
      return applicantValue < criteriaValue && Math.abs(applicantValue - criteriaValue) >= EPSILON;
    case '=':
      return Math.abs(applicantValue - criteriaValue) < EPSILON;
    default:
      return false;
  }
}

/**
 * Evaluates number-based criteria
 */
function evaluateNumberCriteria(applicantAnswer, criteria, label) {
  const applicantValue = parseFloat(applicantAnswer);
  
  // Check if parsing was successful
  if (isNaN(applicantValue)) {
    return {
      status: 'error',
      reason: `Jawaban '${applicantAnswer}' untuk ${label} bukan angka yang valid.`
    };
  }

  const criteriaStr = criteria.toString().trim();
  let operator = '=';
  let criteriaValue;

  // Improved parsing to handle different operator formats
  if (criteriaStr.startsWith('>=')) {
    operator = '>=';
    criteriaValue = parseFloat(criteriaStr.substring(2).trim());
  } else if (criteriaStr.startsWith('<=')) {
    operator = '<=';
    criteriaValue = parseFloat(criteriaStr.substring(2).trim());
  } else if (criteriaStr.startsWith('>')) {
    operator = '>';
    criteriaValue = parseFloat(criteriaStr.substring(1).trim());
  } else if (criteriaStr.startsWith('<')) {
    operator = '<';
    criteriaValue = parseFloat(criteriaStr.substring(1).trim());
  } else if (criteriaStr.startsWith('=')) {
    operator = '=';
    criteriaValue = parseFloat(criteriaStr.substring(1).trim());
  } else if (criteriaStr.toLowerCase().startsWith('min ')) {
    operator = '>=';
    criteriaValue = parseFloat(criteriaStr.substring(4).trim());
  } else if (criteriaStr.toLowerCase().startsWith('max ')) {
    operator = '<=';
    criteriaValue = parseFloat(criteriaStr.substring(4).trim());
  } else if (criteriaStr.toLowerCase().startsWith('minimal ')) {
    operator = '>=';
    criteriaValue = parseFloat(criteriaStr.substring(8).trim());
  } else if (criteriaStr.toLowerCase().startsWith('maksimal ')) {
    operator = '<=';
    criteriaValue = parseFloat(criteriaStr.substring(9).trim());
  } else {
    // If no operator, assume it's just a number for equality
    criteriaValue = parseFloat(criteriaStr);
  }

  if (isNaN(criteriaValue)) {
    return {
      status: 'error',
      reason: `Format kriteria '${criteria}' untuk ${label} tidak valid.`
    };
  }

  // Use safe comparison
  const isMatch = safeNumberComparison(applicantValue, operator, criteriaValue);
  
  let operatorText = '';
  switch (operator) {
    case '>=':
      operatorText = 'minimal';
      break;
    case '>':
      operatorText = 'lebih dari';
      break;
    case '<=':
      operatorText = 'maksimal';
      break;
    case '<':
      operatorText = 'kurang dari';
      break;
    case '=':
      operatorText = 'sama dengan';
      break;
  }

  if (isMatch) {
    return {
      status: 'pass',
      reason: `Jawaban ${applicantAnswer} untuk ${label} memenuhi kriteria ${operatorText} ${criteriaValue}.`
    };
  } else {
    return {
      status: 'fail',
      reason: `Jawaban ${applicantAnswer} untuk ${label} tidak memenuhi syarat ${operatorText} ${criteriaValue}.`
    };
  }
}

/**
 * Evaluates text-based criteria
 */
function evaluateTextCriteria(applicantAnswer, criteria, label) {
  const criteriaStr = criteria.toString();
  const cleanedCriteria = criteriaStr.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
  const cleanedAnswer = applicantAnswer.toString().trim().toLowerCase();
  
  if (cleanedCriteria.length === 0) {
    return {
      status: 'error',
      reason: `Kriteria untuk ${label} kosong.`
    };
  }
  
  const isMatch = cleanedCriteria.includes(cleanedAnswer);

  if (isMatch) {
    return {
      status: 'pass',
      reason: `Jawaban '${applicantAnswer}' untuk ${label} memenuhi kriteria yang diizinkan.`
    };
  } else {
    return {
      status: 'fail',
      reason: `Jawaban '${applicantAnswer}' untuk ${label} tidak ada di daftar yang diizinkan: ${cleanedCriteria.join(', ')}.`
    };
  }
}