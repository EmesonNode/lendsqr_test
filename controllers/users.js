
const express = require('express');
const knex = require('../knexfile');
const common = require('../file/common');
const jwt = require('../file/jwt');
const router = express.Router();
//const { raw, ref } = require('objection');


//Interest: Lotto or Betting


//FUNCTIONS
async function GetTransactions(id) {
    const [rows, fields] = await knex.raw("Select a.transactiontype, format(a.amount,2) as amount, a.description, concat(b.firstname,' ',b.lastname, ' (',b.accountno,')') as transaction_user, date_format(a.datecreated, '%d-%b-%Y %h:%i:%s%p') as transaction_date from lendsqr_transactions a left join lendsqr_users b on b.id=a.initiatedby where a.userid=? order by a.id desc limit 25", [id]);
    return rows;
}

async function GetProfile(_id) {
    const [rows, fields] = await knex.raw("Select firstname, lastname, email, accountno, format(accountbal,2) as accountbal, date_format(datemodified, '%d-%b-%Y %h:%i:%s%p') as last_updated from lendsqr_users where id=?", [_id]);

    return rows;
}





/**
 * @swagger
 * /account/create:
 *  post:
 *    summary: Create account
 *    tags:
 *      - User Account
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              firstname:
 *                type: string
 *              lastname:
 *                type: string
 *              email:
 *                type: string
 *              password:
 *                type: string
 *              confirmpassword:
 *                type: string
 *              pin:
 *                type: string
 *              confirmpin:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Ok
 */
router.route('/account/create').post(async (req, res, next) => {

    try {
        let { firstname, lastname, email, password, confirmpassword, pin, confirmpin } = req.body;

        if (firstname != "" && lastname != "" && email != "") {
            if (password != "" && (password === confirmpassword)) {
                if (pin != "" && pin.toString().length == 4 && (pin === confirmpin)) {

                    let dup = await knex("lendsqr_users").select("*").where("email", email).first();

                    if (dup != null) {
                        res.status(200).json(common.error_return("The email entered already exist"));
                    } else {


                        let password_hashed1 = await common.GenerateEncryptedPassword(password);
                        let pin_hashed1 = await common.GenerateEncryptedPassword(pin.toString());

                        let _user = {
                            firstname: firstname,
                            lastname: lastname,
                            email: email,
                            accountbal: "0",
                            datecreated: new Date(),
                            datemodified: new Date(),
                            password: password_hashed1,
                            pin: pin_hashed1
                        };

                        let data = await knex("lendsqr_users").insert(_user);

                        if (data[0] > 0) {

                            let account_no = common.GenerateAccountNo(data[0]);

                            //update account no
                            let acc_no = {
                                accountno: account_no
                            };
                            let upd_data = await knex("lendsqr_users").update(acc_no).where("Id", data[0]);

                            res.status(200).json(common.success_return("Account profile created successfully, please login with your credentials", []))
                        } else {
                            res.status(500).json(common.error_log_return("Error creating account, please try again later"));
                        }
                    }

                } else { res.status(200).json(common.error_return("Please confirm your pin entered and it must be 4-digits")); }

            } else { res.status(200).json(common.error_return("Please confirm your password entered")); }
        } else { res.status(200).json(common.error_return("All fields are required")); }
    } catch (err) { res.status(500).json(common.error_log_return(err, req)); }
});

/**
 * @swagger
 * /account/login:
 *  post:
 *    summary:  Login to your account
 *    tags:
 *      - User Account
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *              password:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.route('/account/login').post(async (req, res, next) => {

    try {

        let { email, password } = req.body;


        let _user = await knex("lendsqr_users").select("*").where("email", email).first();

        if (_user == null || _user == undefined) {
            res.status(200).json(common.error_return("Incorrect username/password, please try again"));
        } else {


            let hashed1 = await common.VerifyEncryptedPassword(password, _user.password);

            if (hashed1) { //true
                let token = jwt.GenerateToken(_user.id, email);

                res.status(200).json({
                    Code: 1,
                    Message: "Login successful",
                    Token: token,
                    Profile: await GetProfile(_user.id)
                });

            } else {
                res.status(200).json(common.error_return("Incorrect username/password"));
            }
        }
    } catch (err) {

        res.status(500).json(common.error_log_return(err, req));
    }

});


/**
 * @swagger
 * /account/transactions:
 *  get:
 *    summary: Get recent transaction history
 *    tags:
 *      - User Transactions (Authorization Required)
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.get('/account/transactions', jwt.ValidateToken, async (req, res, next) => {
    try {
        let { user_id } = req.body.login;

        res.status(200).json(common.success_return("Transactions", await GetTransactions(user_id)));

    } catch (err) {
        res.status(500).json(common.error_log_return(err, req));
    }
});


/**
 * @swagger
 * /account/balance:
 *  get:
 *    summary: Retrieve account balance
 *    tags:
 *      - User Transactions (Authorization Required)
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.get('/account/balance', jwt.ValidateToken, async (req, res, next) => {
    try {
        let { user_id } = req.body.login;

        let data = await knex("lendsqr_users").select("*").where("id", user_id).first();
        if (data != null || data != undefined) {

            res.status(200).json(common.success_return("Your account balance is " + data.accountbal, []));
        } else { res.status(200).json(common.error_return("Error retrieving data, please try again later")); }

    } catch (err) {
        res.status(500).json(common.error_log_return(err, req));
    }
});


/**
 * @swagger
 * /account/transfer:
 *  post:
 *    summary: Transfer fund from your account to another account
 *    tags:
 *      - User Transactions (Authorization Required)
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              accountno:
 *                type: string
 *              amount:
 *                type: integer
 *                example: 0
 *              description:
 *                type: string
 *              pin:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.post('/account/transfer', jwt.ValidateToken, async (req, res, next) => {

    try {
        let { accountno, amount, description, pin } = req.body;
        let { user_id } = req.body.login;

        if (accountno != "" && amount > 0 && pin != "") {

            //initiate transaction
            knex.transaction(async function (trx) {


                //let _from = await knex("lendsqr_users").select("*").where("id", user_id).first();
                let _from = await trx.select("*").from("lendsqr_users").where("id", user_id).first();
                if (_from != null || _from != undefined) {

                    let hashed1 = await common.VerifyEncryptedPassword(pin, _from.pin);
                    if (hashed1) { //true

                        if (_from.accountno != accountno) {

                            if (parseFloat(_from.accountbal) >= amount) {

                                let _to = await trx.select("*").from("lendsqr_users").where("accountno", accountno).first();
                                if (_to != null || _to != undefined) {

                                    //initiate debit
                                    let new_bal = parseFloat(_from.accountbal) - amount;
                                    let _from_dt = {
                                        accountbal: new_bal,
                                        datemodified: new Date()
                                    };
                                    await trx.where("id", user_id).update(_from_dt).into("lendsqr_users");

                                    //transaction history
                                    let _from_hs = {
                                        userid: user_id,
                                        transactiontype: "Transfer",
                                        amount: amount,
                                        initiatedby: _to.id,
                                        datecreated: new Date(),
                                        description: description
                                    };
                                    let t1_id = await trx.insert(_from_hs).into("lendsqr_transactions");

                                    //initiate credit
                                    let newbal1 = parseFloat(_to.accountbal) + amount;
                                    let _to_dt = {
                                        accountbal: newbal1,
                                        datemodified: new Date()
                                    };
                                    await trx.where("id", _to.id).update(_to_dt).into("lendsqr_users");

                                    //transaction history
                                    let _to_hs = {
                                        userid: _to.id,
                                        transactiontype: "Deposit (Transferred)",
                                        amount: amount,
                                        initiatedby: user_id,
                                        datecreated: new Date(),
                                        description: description
                                    };
                                    let t2_id = await trx.insert(_to_hs).into("lendsqr_transactions");

                                    //success
                                    res.status(200).json(common.success_return("Your transfer of " + amount + " to " + _to.firstname + " " + _to.lastname + " (" + accountno + ") was successful. Current balance is " + new_bal, []));

                                } else { res.status(200).json(common.error_return("Account number entered is incorrect, record not found")); }

                            } else {
                                res.status(200).json(common.error_return("Insufficient fund in your account"));
                            }
                        } else {
                            res.status(200).json(common.error_return("The account entered is the same with your account. You cant transfer from/to your account"));
                        }

                    } else {
                        res.status(200).json(common.error_return("Incorrect pin"));
                    }
                } else {
                    res.status(200).json(common.error_return("Error retrieving your account details, please try again later"));
                }
            });


        } else {
            res.status(200).json(common.error_return("All fields are required"));
        }

    } catch (err) { res.status(500).json(common.error_log_return(err, req)); }
});


/**
 * @swagger
 * /account/withdraw:
 *  post:
 *    summary: Withdraw fund from account
 *    tags:
 *      - User Transactions (Authorization Required)
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              amount:
 *                type: integer
 *                example: 0
 *              pin:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.post('/account/withdraw', jwt.ValidateToken, async (req, res, next) => {

    try {
        let { amount, pin } = req.body;
        let { user_id } = req.body.login;

        if (amount > 0 && pin != "") {


            //initiate transaction
            knex.transaction(async function (trx) {

                let _from = await trx.select("*").from("lendsqr_users").where("id", user_id).first();
                if (_from != null || _from != undefined) {

                    let hashed1 = await common.VerifyEncryptedPassword(pin, _from.pin);
                    if (hashed1) { //true

                        if (parseFloat(_from.accountbal) >= amount) {

                            //initiate debit
                            let new_bal = parseFloat(_from.accountbal) - amount;
                            let _from_dt = {
                                accountbal: new_bal,
                                datemodified: new Date()
                            };
                            await trx.where("id", user_id).update(_from_dt).into("lendsqr_users");

                            //transaction history
                            let _from_hs = {
                                userid: user_id,
                                transactiontype: "Withdrawal",
                                amount: amount,
                                initiatedby: user_id,
                                datecreated: new Date(),
                                description: ""
                            };
                            let t1_id = await trx.insert(_from_hs).into("lendsqr_transactions");

                            //success
                            res.status(200).json(common.success_return("The fund withdrawal of " + amount + " was successful. Current balance is " + new_bal, []));

                        } else {
                            res.status(200).json(common.error_return("Insufficient fund in your account"));
                        }

                    } else {
                        res.status(200).json(common.error_return("Incorrect pin"));
                    }
                } else {
                    res.status(200).json(common.error_return("Error retrieving your account details, please try again later"));
                }
            });
        } else {
            res.status(200).json(common.error_return("All fields are required"));
        }

    } catch (err) { res.status(500).json(common.error_log_return(err, req)); }
});

/**
 * @swagger
 * /account/deposit/self:
 *  post:
 *    summary: Fund your own account
 *    tags:
 *      - User Transactions (Authorization Required)
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              amount:
 *                type: integer
 *                example: 0
 *              pin:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.post('/account/deposit/self', jwt.ValidateToken, async (req, res, next) => {

    try {
        let { amount, pin } = req.body;
        let { user_id } = req.body.login;

        if (amount > 0 && pin != "") {


            //initiate transaction
            knex.transaction(async function (trx) {

                let _from = await trx.select("*").from("lendsqr_users").where("id", user_id).first();
                if (_from != null || _from != undefined) {


                    let hashed1 = await common.VerifyEncryptedPassword(pin, _from.pin);
                    if (hashed1) { //true
                        //initiate debit
                        let new_bal = parseFloat(_from.accountbal) + amount;
                        let _from_dt = {
                            accountbal: new_bal,
                            datemodified: new Date()
                        };
                        await trx.where("id", user_id).update(_from_dt).into("lendsqr_users");

                        //transaction history
                        let _from_hs = {
                            userid: user_id,
                            transactiontype: "Deposit",
                            amount: amount,
                            initiatedby: user_id,
                            datecreated: new Date(),
                            description: ""
                        };
                        let t1_id = await trx.insert(_from_hs).into("lendsqr_transactions");

                        //success
                        res.status(200).json(common.success_return("The fund deposit of " + amount + " was successful. Current balance is " + new_bal, []));

                    } else {
                        res.status(200).json(common.error_return("Incorrect pin"));
                    }
                } else {
                    res.status(200).json(common.error_return("Error retrieving your account details, please try again later"));
                }

            });

        } else {
            res.status(200).json(common.error_return("All fields are required"));
        }

    } catch (err) { res.status(500).json(common.error_log_return(err, req)); }
});


/**
 * @swagger
 * /account/deposit/others:
 *  post:
 *    summary: Fund your own account
 *    tags:
 *      - User Transactions (Authorization Required)
 *
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              amount:
 *                type: integer
 *                example: 0
 *              accountno:
 *                type: string
 *              pin:
 *                type: string
 *
 *    responses:
 *      200:
 *        description: Object
 */
router.post('/account/deposit/others', jwt.ValidateToken, async (req, res, next) => {

    try {
        let { amount, pin, accountno } = req.body;
        let { user_id } = req.body.login;

        if (amount > 0 && pin != "" && accountno != "") {

            //initiate transaction
            knex.transaction(async function (trx) {

                let _user = await trx.select("*").from("lendsqr_users").where("id", user_id).first();
                if (_user != null || _user != undefined) {

                    let hashed1 = await common.VerifyEncryptedPassword(pin, _user.pin);
                    if (hashed1) { //true

                        let _from = await trx.select("*").from("lendsqr_users").where("accountno", accountno).first();
                        if (_from != null || _from != undefined) {

                            //initiate debit
                            let new_bal = parseFloat(_from.accountbal) + amount;
                            let _from_dt = {
                                accountbal: new_bal,
                                datemodified: new Date()
                            };
                            await trx.where("id", _from.id).update(_from_dt).into("lendsqr_users");

                            //transaction history
                            let _from_hs = {
                                userid: _from.id,
                                transactiontype: "Deposit",
                                amount: amount,
                                initiatedby: user_id,
                                datecreated: new Date(),
                                description: ""
                            };
                            let t1_id = await trx.insert(_from_hs).into("lendsqr_transactions");

                            //success
                            res.status(200).json(common.success_return("The fund deposit to " + _from.firstname + " " + _from.lastname + " (" + accountno + ") was successful", []));

                        } else {
                            res.status(200).json(common.error_return("Incorrect account number, record not found for the account number entered"));
                        }

                    } else {
                        res.status(200).json(common.error_return("Incorrect pin"));
                    }

                } else {
                    res.status(200).json(common.error_return("Error verifying your account"));
                }
            });

        } else {
            res.status(200).json(common.error_return("All fields are required"));
        }

    } catch (err) { res.status(500).json(common.error_log_return(err, req)); }
});



module.exports = router;
