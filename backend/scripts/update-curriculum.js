const db = require('../db')
const { applyCurriculumRevision } = require('../migrations/threeModuleCurriculum')

applyCurriculumRevision(db.promise())
    .then((changes) => console.log(changes.length ? changes.join('\n') : 'Curriculum revision already applied, or no curriculum has been seeded.'))
    .catch((error) => { console.error('Curriculum update failed:', error.message); process.exitCode = 1 })
    .finally(() => db.promise().end())
