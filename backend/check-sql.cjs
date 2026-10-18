// Verifies that the columns named in each INSERT/SELECT match the number of
// placeholders, for the SQL built by the admin content service.
const fs = require("fs")
const path = require("path")

const source = fs.readFileSync(path.join(__dirname, "services", "contentService.js"), "utf8")
const lines = source.split("\n")

let checked = 0
let problems = 0

lines.forEach((line, index) => {
    const insert = line.match(/INSERT INTO\s+\\?`?(\w+)\\?`?\s*\(([^)]*)\)/i)
    if (!insert) return
    // Grab the next two lines to find the VALUES placeholder list; some inserts
    // are written on a single line, others split the VALUES clause.
    const window = [line, lines[index + 1] || "", lines[index + 2] || ""].join(" ")
    const values = window.match(/VALUES\s*\(([^)]*)\)/i)
    if (!values) return

    const columns = insert[2].split(",").map((column) => column.trim()).filter(Boolean)
    const placeholders = values[1].split(",").map((token) => token.trim()).filter(Boolean)

    checked += 1
    if (columns.length !== placeholders.length) {
        problems += 1
        console.log(`MISMATCH line ${index + 1}: ${insert[1]} has ${columns.length} columns but ${placeholders.length} values`)
        console.log(`   columns      : ${columns.join(", ")}`)
        console.log(`   values       : ${placeholders.join(", ")}`)
    }
})

console.log(`checked ${checked} INSERT statements, ${problems} mismatched`)
