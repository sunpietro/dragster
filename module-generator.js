const fs = require('fs').promises;

async function generate() {
    const [script, comment, template] = await Promise.all([
        fs.readFile('dragster-script.js', 'utf8'),
        fs.readFile('dragster-comment.js', 'utf8'),
        fs.readFile('template.es6.js', 'utf8'),
    ]);

    const output = template.replace('[DRAGSTER]', script).replace('[COMMENT]', comment);

    await fs.writeFile('dragster.js', output, 'utf8');
}

generate().catch((error) => {
    console.error('[ERROR]', error);
    process.exit(1);
});
