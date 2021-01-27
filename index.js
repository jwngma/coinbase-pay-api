console.log("CoinApp Running");
const express = require("express");
const Client = require("coinbase").Client;
const app = express();
app.use(express.json());
var port = process.env.PORT || 3000;
require("dotenv").config();
// const API_KEY = "BFzKJUMT5s7FGoY3";
// const API_SECRET = "nMzw36oEv45TI2WqyRiidj3DaBIuGNKm";

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const DEFAULT_ACCOUNT = "primary";

// {
// "to": "born_to_balll@yahoo.co.uk",
// "amount": "0.000002",
// "currency": "LTC",
// "accountID": "4f9fc140-a966-5779-abb4-43d684d4a1be"
// }

const client = new Client({
  apiKey: API_KEY,
  apiSecret: API_SECRET,
  api_version: "2021-01-22",
  strictSSL: false,
});
app.get("/", (req, res, next) => {
  res.status(200).json({
    message: "The Coinbase pay Api is Working",
  });
});

app.post("/send/", function (req, res) {
  const params = req.body;
  // const to = params.to;
  // const amount = params.amount;
  // const currency = params.currency;
  if (!params.accountID) {
    params.accountID = DEFAULT_ACCOUNT;
  }

  getAccount(client, params, res)
    .then((details) => {
      const account = details.account;
      console.log("getAccount:", account);
      return sendMoney(account, details.params).then((output) => {
        console.log("Successful: ", output);
        //res.status(200).send(output);
        res.status(200).json({
          status: true,
          message: "Successful",
        });
      });
    })
    .catch((err) => {
      switch (err.name) {
        case "ExpiredToken":
          res.status(401).send("Coinbase session expired");
          break;

        case "ValidationError":
          res.status(400).send(err.message);
          break;

        default:
          res.status(400).send(err.message);
          break;
      }
    });
});

function getAccount(client, params, res) {
  if (!client) {
    //Unauthorized
    res.sendStatus(401);
    return;
  }
  return new Promise((resolve, reject) => {
    client.getAccount(params.accountID, function (err, account) {
      if (err) {
        reject(err);
        return;
      } else {
        resolve({
          account,
          params,
        });
        return;
      }
    });
  });
}

function sendMoney(account, params) {
  return new Promise((resolve, reject) => {
    console.log("sendMoney: ", params);
    account.sendMoney(
      {
        to: `${params.to}`,
        amount: `${params.amount}`,
        currency: `${params.currency}`,
        description: "+" + `${params.amount} ` + `${params.description}`,
      },
      function (err, tx) {
        if (err) {
          console.log("ErrorName", err.name);
          reject(err);
        } else {
          resolve(tx);
        }
      }
    );
  });
}

app.listen(port, function () {
  console.log(`The Coinbase app listening on port 3000`);
});
