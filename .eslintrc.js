module.exports = {
    "env": {
        "mocha": true,
        "node": true,
        "protractor": true,
        "es6": true
    },
    "extends": "airbnb",
    "parser": "babel-eslint",
    "rules": {
        //"import/no-extraneous-dependencies": ["error", { "devDependencies": ["**/*.spec.js"] }],
        "indent": ["error", 4],
        "no-param-reassign": 0,
        "class-methods-use-this": 0,
        "no-underscore-dangle": 0,
        "no-restricted-syntax": 0,
        "no-await-in-loop": 0,
        "arrow-body-style": ["error", "as-needed", { "requireReturnForObjectLiteral": true }],
        "camelcase": 0,
        "max-len": 0,
    }
}
