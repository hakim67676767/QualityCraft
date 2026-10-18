ALTER TABLE `question` ADD COLUMN options TEXT NULL AFTER type;

UPDATE `question` SET options = '["Prevent defects","Find every possible defect","Write more code"]' WHERE question_text = 'What is the main goal of quality assurance?';
UPDATE `question` SET options = '["True","False"]' WHERE question_text IN ('Quality is owned only by the testing team.', 'Boundary values are useful test cases.', 'Metrics should be collected without a decision in mind.');
UPDATE `question` SET options = '["Peer review","Code deployment","Data backup"]' WHERE question_text = 'Which activity helps find defects early?';
UPDATE `question` SET options = '["A consistent benchmark","A project schedule","A user password"]' WHERE question_text = 'What does a quality standard provide?';
UPDATE `question` SET options = '["High-impact risks","Random features","Finished documentation"]' WHERE question_text = 'What should risk-based testing prioritize?';
UPDATE `question` SET options = '["Unit test","Load test","Acceptance test"]' WHERE question_text = 'Which test checks a small unit of code?';
UPDATE `question` SET options = '["Reintroduced defects","New employees","Faster internet"]' WHERE question_text = 'What does regression testing protect against?';
UPDATE `question` SET options = '["Improve the way the team works","Assign more meetings","Remove all documentation"]' WHERE question_text = 'What is the purpose of a retrospective?';
UPDATE `question` SET options = '["Defect trend","Screen brightness","Office location"]' WHERE question_text = 'Which signal can reveal a recurring problem?';
UPDATE `question` SET options = '["A defined success metric","A longer report","More source code"]' WHERE question_text = 'What makes an improvement measurable?';
