import Atmosphere from '../src';

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define(factory);
    } else if(typeof exports !== 'undefined') {
        // CommonJS
        module.exports = factory();
    } else {
        // Browser globals, Window
        root.atmosphere = factory();
    }
}(this, function () {
    return Atmosphere;
}));