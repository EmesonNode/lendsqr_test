require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const cors = require('cors');

const path = require("path");

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

const app = express();

const port = process.env.PORT || 3101;

//cors enabled
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));

//for xxx-url-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));


const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "LendSQR Test Code",
            description: "API Documentation",
            version: "1.0.0",
        },
        // servers: [
        //   {
        //     url: `http://localhost:${PORT}`,
        //   },
        //   {
        //     url: `https://localhost:${PORT}`,
        //   },
        // ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: [`${__dirname}/controllers/*.js`], // files containing annotations as above
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
//console.log(swaggerDocs);
app.use("/swagger", swaggerUI.serve, swaggerUI.setup(swaggerDocs));


//for json
app.use(bodyParser.json());

app.use('', require('./controllers/users'));



app.get('/test', (req, res) => {
    res.send('Welcome to Test Environment');
});


app.use(express.static(path.join(__dirname, "./logs")));

app.listen(port, () => {
    console.log(`Test app listening at ${port}`);
});