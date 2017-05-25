/* global Promise */

var fs = require('fs');
var promises = [
    new Promise(function (resolve, reject) {
        fs.readFile('dragster-script.js', 'utf8', function (error, data) {
            if (error) {
                reject(error);

                return;
            }

            resolve(data);
        });
    }),
    new Promise(function (resolve, reject) {
        fs.readFile('dragster-comment.js', 'utf8', function (error, data) {
            if (error) {
                reject(error);

                return;
            }

            resolve(data);
        });
    }),
    new Promise(function (resolve, reject) {
        fs.readFile('template.common.js', 'utf8', function (error, data) {
            if (error) {
                reject(error);

                return;
            }

            resolve(data);
        });
    }),
    new Promise(function (resolve, reject) {
        fs.readFile('template.es6.js', 'utf8', function (error, data) {
            if (error) {
                reject(error);

                return;
            }

            resolve(data);
        });
    })
];

Promise.all(promises).then(function (files) {
    var scriptContent = files[0];
    var scriptComment = files[1];
    var commonTemplate = files[2];
    var es6Template = files[3];
    var writes = [
        new Promise(function (resolve, reject) {
            fs.writeFile(
                'dragster.js',
                commonTemplate.replace('[DRAGSTER]', scriptContent).replace('[COMMENT]', scriptComment),
                'utf8',
                function (error) {
                    if (error) {
                        reject(error);

                        return;
                    }

                    resolve();
                }
            );
        }),
        new Promise(function (resolve, reject) {
            fs.writeFile(
                'dragster.es6.js',
                es6Template.replace('[DRAGSTER]', scriptContent).replace('[COMMENT]', scriptComment),
                'utf8',
                function (error) {
                    if (error) {
                        reject(error);

                        return;
                    }

                    resolve();
                }
            );
        }),
    ];

    return Promise.all(writes);
}).catch(function (error) {
    console.log('[ERROR]');
    console.log(error);
    console.log('=======');
});
