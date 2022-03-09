const { sign, verify } = require('jsonwebtoken');
const common = require("./common");

let TOKEN_SECRET = "09f26e402586e2faa8da4c98a35f1b20d6b033c60";
//let TOKEN_KEY = "a1b2c3d4e5f6g7h8i9j0";



function GenerateToken(_id, _email) {
    return sign({ user_id: _id, user_email: _email }, TOKEN_SECRET, { expiresIn: '12h' });
}

function ValidateToken(req, res, next) {

    try {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]

        if (token == null) { res.status(401).json(common.error_return("Unauthorized Access")); }
        else {
            let claims = verify(token, TOKEN_SECRET);

            req.body.login = claims;

            next();
        }
    } catch (err) {
        res.status(500).json(common.error_log_return(err, req));
    }

}



module.exports = {
    GenerateToken, ValidateToken
}