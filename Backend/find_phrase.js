const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== "node_modules") {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (file.endsWith(".js") || file.endsWith(".jsx")) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, ".."));
files.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lower = content.toLowerCase();
  if (lower.includes("cannot delete") || lower.includes("team manager") || lower.includes("assigned tasks")) {
    console.log("MATCH FOUND in file:", file);
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      const lineLower = line.toLowerCase();
      if (lineLower.includes("cannot delete") || lineLower.includes("team manager") || lineLower.includes("assigned tasks")) {
        console.log(`  Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
});
console.log("Search finished.");
process.exit(0);
