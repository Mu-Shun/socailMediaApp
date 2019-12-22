if (process.env.NODE_ENV === 'production'){
    module.exports = require('./key-prod')
}else {
    module.exports = require('./keys-dev')
}