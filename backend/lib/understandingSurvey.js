const RATING_OPTIONS = ['1', '2', '3', '4', '5'];
const SURVEY_VERSION = 'understanding-v1';
const SURVEY_ITEMS = [
  ['testing_purpose', 'I understand the purpose of software testing.'],
  ['qa_and_testing', 'I can explain the difference between quality assurance and software testing.'],
  ['testing_limits', 'I understand why testing cannot prove that software has no defects.'],
  ['test_case', 'I can identify the input, steps, and expected result in a test case.'],
  ['expected_actual', 'I can compare expected and actual results to recognise a software defect.'],
  ['bug_report', 'I can describe a software defect using clear steps to reproduce it.'],
  ['defect_severity', 'I understand how the severity of a defect describes its impact.'],
  ['testing_types', 'I can explain the difference between unit testing and regression testing.'],
  ['test_inputs', 'I can choose boundary values and invalid inputs to test a feature.'],
  ['quality_improvement', 'I can use test results to suggest a practical quality improvement.'],
];

function summariseRatings(questions, answers) {
  const ratings = questions.map((question, index) => ({
    itemId: question.question_id,
    constructKey: question.construct_key,
    statement: question.question_text,
    rating: Number(answers[index]),
  }));
  return { ratings, ratingMean: Math.round(ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length * 100) / 100 };
}

module.exports = { RATING_OPTIONS, SURVEY_VERSION, SURVEY_ITEMS, summariseRatings };
