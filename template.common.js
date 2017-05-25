[COMMENT] //jshint ignore:line
;(function (root, moduleName, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(moduleName, factory);
    } else if (typeof exports === 'object') {
        exports = module.exports = factory();
    } else {
        root[moduleName] = factory();
    }
})(this, 'Dragster', function () {
    'use strict';

[DRAGSTER]

    return Dragster;
});
