console.log("CoinApp Running");
const express = require("express");
const https = require("https");
const Client = require("coinbase").Client;

const app = express();
const sendAmt = "0.000025";
let client = null;
/**
 * Developer access token is needed to test coinbase. Get this from developer every 30mins
 * Only neded in test
 */
// const testAccessToken = "edb284e2bae8c9e7c451d36bc70c8810a1017478c678de5446cc523f0301cc21";

app.get("/", function (req, res) {
  res.redirect(
    `https://www.coinbase.com/oauth/authorize?client_id=4ae06befeedf464ecc5606a87163dc3236621360730133e690ba9c90a494ef10&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fform&response_type=code&scope=wallet:accounts:read,wallet:transactions:send&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=day`
  );
});

app.get("/form", function (req, res) {
  const params = req.query;
  const code = params.code;
  return getAccessToken(code).then((secure) => {
    const prodAccessToken = secure.access_token;
    const accessToken = prodAccessToken;
    client = new Client({
      accessToken: accessToken,
      refreshToken: secure.refresh_token,
      strictSSL: false, //Change to true on production
    });
    getAccount(client, res)
      .then((details) => {
        accountID = details.account.id;
        const balString = `Balance: ${details.account.balance.currency} ${details.account.balance.amount}`;
        res.send(mainForm({ code, balString }));
      })
      .catch((err) => {
        console.log("Error1: ", err);
      });
  });
});

app.get("/send/", function (req, res) {
  const params = req.query;
  const code = params.code;
  const destID = params.destID;

  getAccount(client, res)
    .then((details) => {
      const accountID = details.account.id;
      return sendFunds(destID, accountID, params, details.accessToken, res);
    })
    .catch((err) => {
      console.log("Error2: ", err);
    });
});

function getAccount(client, res) {
  if (!client) {
    //Unauthorized
    res.sendStatus(401);
    return;
  }
  return new Promise((resolve, reject) => {
    client.getAccount("primary", function (err, account) {
      if (err) {
        switch (err.name) {
          case "ExpiredToken":
            res.send(
              "Coinbase testing token has expired. Please contact developer"
            );

          case "InvalidScope":
            res.send("Contact developer. Err001");
        }
        reject(err);
      } else {
        resolve({
          account,
          accessToken: client.accessToken,
        });
      }
    });
  });
}

function sendFunds(destID, accountID, params, accessToken, res) {
  sendMoney(destID, accountID, params, accessToken)
    .then((data) => {
      console.log("Finally", data);
    })
    .catch((err) => {
      console.log("XX: ", err.id);
      switch (err.id) {
        case "expired_token":
          res.send(
            "Coinbase testing token has expired. Please contact developer"
          );
          break;

        case "invalid_token":
          res.send("Please update your token to a valid one");
          break;

        case "validation_error":
          res.send(err.message);
          break;

        case "two_factor_required":
          res.send(authForm(params));
          break;

        case "invalid_request":
          res.send(err.message);
          break;

        default:
          res.send("Contact developer. Err002");
          break;
      }
    });
}

function sendMoney(destID, accountID, params, accessToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      type: "send",
      to: `${destID}`,
      amount: sendAmt,
      currency: "BTC",
    });

    const options = {
      hostname: "api.coinbase.com",
      port: 443,
      path: `/v2/accounts/${accountID}/transactions/`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Accept-Language": "en",
        "CB-VERSION": "2021-01-22",
      },
    };

    if (params.code2fa) {
      options.headers["CB-2FA-Token"] = `${params.code2fa}`;
    }

    const req = https.request(options, (res) => {
      // console.log(`statusCode: ${res.statusCode}`);
      let result = "";
      res.on("data", (chunk) => {
        result += chunk;
      });

      res.on("end", () => {
        process.stdout.write(result);
        const output = JSON.parse(result);
        if (output.errors.length > 0) {
          reject(output.errors[0]);
        } else {
          resolve(output);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });
    req.write(data);
    req.end();
  });
}

function getAccessToken(code) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id:
        "4ae06befeedf464ecc5606a87163dc3236621360730133e690ba9c90a494ef10",
      client_secret:
        "4b36897a62d47cd4f82b43085acb72d271aa20c25aaf5e26104fdc9dc54b8a83",
      redirect_uri: "http://127.0.0.1:3000/form",
    });

    const options = {
      hostname: "api.coinbase.com",
      port: 443,
      path: `/oauth/token`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en",
      },
    };

    const req = https.request(options, (res) => {
      // console.log(`statusCode: ${res.statusCode}`);
      let result = "";
      res.on("data", (chunk) => {
        result += chunk;
      });

      res.on("end", () => {
        process.stdout.write(result);
        resolve(JSON.parse(result));
      });
    });

    req.on("error", (error) => {
      reject(error);
    });
    req.write(data);
    req.end();
  });
}

function authForm(params) {
  return `<body>\r\n\r\n<h5>Enter the 2-step verification code provided by SMS to your phone<\/h5>\r\n\r\n<form action=\"\/send\">\r\n   <label for=\"fname\">Code:<\/label><br>\r\n  <input type=\"text\" id=\"code2fa\" name=\"code2fa\" value=\"\" maxlength=\"8\" size=\"8\"><br>\r\n  <input type=\"hidden\" id=\"destID\" name=\"destID\" value=\"${params.destID}\"><br>\r\n  <input type=\"hidden\" id=\"code\" name=\"code\" value=\"${params.code}\">\r\n  <input type=\"submit\" value=\"Verify\">\r\n<\/form> \r\n\r\n<p><\/p>\r\n\r\n\r\n\r\n<\/body>`;
}

function mainForm(data) {
  return `<!DOCTYPE html>\r\n<html>\r\n<head>\r\n<\/head>\r\n<body>\r\n<h2>CoinApp<\/h2>\r\n<h5 id=\"bal\">${data.balString}<\/h5>\r\n<form action=\"\/send\">\r\n  <label for=\"fname\">Email or coin address:<\/label><br>\r\n  <input type=\"text\" id=\"destID\" name=\"destID\" value=\"\"><br>\r\n  <input type=\"hidden\" id=\"code\" name=\"code\" value=\"${data.code}\"><br>\r\n  <input type=\"submit\" value=\"Send\">\r\n<\/form> \r\n<p>If you click \"Submit\" ${sendAmt} coins will be sent.<\/p>\r\n<\/body><\/html>\r\n`;
}

app.listen(3000);
